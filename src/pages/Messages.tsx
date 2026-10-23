import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, orderBy, arrayUnion, limit 
} from 'firebase/firestore';
import { Business, ChatMessage, ChatRoom } from '../types';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router';
import { 
  MessageSquare, Send, Paperclip, Image as ImageIcon, Trash2, 
  Clock, AlertCircle, ArrowRight, Crown, ChevronLeft, User, 
  Store, X, Lock, Plus, Check, FileText, CheckCircle, 
  DollarSign, AlertTriangle, MessageCircle, ShieldCheck,
  Pencil, Loader2, Tag, Briefcase, ShoppingBag, AtSign,
  Phone, MapPin, Star, ExternalLink, Flame, Map as MapIcon, Package
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { canUseLiveChat, getBusinessVipStatus } from '../lib/vipHelper';
import { VipUpgradeRequestModal } from '../components/vip/VipUpgradeRequestModal';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  validateFileSecurity,
  checkReviewRateLimit, 
  recordReviewSubmission, 
  checkIpReviewRateLimit, 
  recordIpReviewLock, 
  containsUrlOrLink, 
  stripUrlsAndLinks, 
  sanitizeInput, 
  getDeviceFingerprint, 
  executeReCaptcha 
} from '../lib/security';
import { getWhatsAppUrl } from '../lib/contactHelper';
import { getGoogleMapsActionUrls, getGoogleMapsEmbedUrl, extractCoordsOrEmbedFromUrl } from '../lib/googleReviewsHelper';
import { submitReviewAtomically } from '../utils/firestoreTransactions';

interface ChatReviewInviteBoxProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

function ChatReviewInviteBox({ businessId, businessName, isOwner }: ChatReviewInviteBoxProps) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkExisting() {
      if (!currentUser || !db || isOwner || !businessId) return;
      try {
        const qReview = query(
          collection(db, 'reviews'),
          where('businessId', '==', businessId),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(qReview);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        let recent = false;
        snap.forEach((d) => {
          const rev = d.data();
          if (rev.createdAt && (now - rev.createdAt) < TWENTY_FOUR_HOURS) {
            recent = true;
          }
        });
        if (isMounted) {
          setHasExistingReview(recent);
        }
      } catch (err) {
        // ignore
      }
    }
    checkExisting();
    return () => { isMounted = false; };
  }, [currentUser, businessId, isOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db) {
      alert("يرجى تسجيل الدخول أولاً لتتمكن من إضافة تقييم.");
      return;
    }

    if (isOwner) {
      alert("لا يمكن لصاحب المنشأة تقييم منشأته الخاصة.");
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      alert("يرجى كتابة ملاحظتك أو تقييمك حول المنشأة.");
      return;
    }

    // 1. Check for links/URLs (strictly prohibited)
    if (containsUrlOrLink(trimmed)) {
      alert("عذراً، يمنع إدراج الروابط أو عناوين المواقع الإلكترونية في التقييمات نهائياً. التقييم مخصص للملاحظات والآراء النصية فقط.");
      return;
    }

    // 2. Local 24-hour rate limit check
    const rateLimit = checkReviewRateLimit(businessId);
    if (!rateLimit.allowed) {
      alert(rateLimit.reason || "يرجى الانتظار قبل إضافة تقييم جديد.");
      return;
    }

    // 3. IP 24-hour rate limit check
    let activeIpLockId = '';
    try {
      const ipCheck = await checkIpReviewRateLimit(businessId);
      if (!ipCheck.allowed) {
        alert(ipCheck.message || "لقد تم تسجيل تقييم لهذا المحل مؤخراً من جهازك أو شبكتك. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد 24 ساعة.");
        return;
      }
      activeIpLockId = ipCheck.lockId || '';
    } catch (ipErr) {
      console.warn("Review IP check fallback:", ipErr);
    }

    setSubmitting(true);
    try {
      // 4. Double check database-level 24-hour limit
      const qUserReview = query(
        collection(db, 'reviews'),
        where('businessId', '==', businessId),
        where('userId', '==', currentUser.uid)
      );
      const userReviewSnap = await getDocs(qUserReview);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      let hasRecentReview = false;
      let newestReviewTime = 0;

      userReviewSnap.forEach(docSnap => {
        const rev = docSnap.data();
        if (rev.createdAt) {
          const diff = now - rev.createdAt;
          if (diff < TWENTY_FOUR_HOURS) {
            hasRecentReview = true;
            if (rev.createdAt > newestReviewTime) {
              newestReviewTime = rev.createdAt;
            }
          }
        }
      });

      if (hasRecentReview) {
        const remainingHours = Math.ceil((TWENTY_FOUR_HOURS - (now - newestReviewTime)) / (60 * 60 * 1000));
        alert(`لقد قمت بإضافة تقييم لهذا المحل مؤخراً باستخدام هذا الحساب. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد ${remainingHours} ساعة.`);
        setSubmitting(false);
        return;
      }

      // 5. Google reCAPTCHA
      let recaptchaToken = '';
      try {
        recaptchaToken = await executeReCaptcha('review_submit');
      } catch (rcError) {
        console.warn("reCAPTCHA fallback:", rcError);
      }

      // 6. Device Fingerprint
      const deviceFingerprint = await getDeviceFingerprint();

      const cleanComment = stripUrlsAndLinks(sanitizeInput(trimmed));
      if (!cleanComment) {
        alert("عذراً، يمنع إدراج الروابط في التقييمات. التقييم مخصص للملاحظات والآراء النصية فقط.");
        setSubmitting(false);
        return;
      }

      const rawUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم';
      const cleanUserName = stripUrlsAndLinks(sanitizeInput(rawUserName)) || 'مستخدم';

      // 7. Atomic Review Submission
      await submitReviewAtomically(db, businessId, {
        userId: currentUser.uid,
        userName: cleanUserName,
        rating,
        comment: cleanComment,
        deviceFingerprint,
        recaptchaToken: recaptchaToken || 'token_chat',
        createdAt: now,
        ipLockId: activeIpLockId || undefined
      });

      // 8. Update rate limit history
      recordReviewSubmission(businessId);
      if (activeIpLockId) {
        await recordIpReviewLock(businessId, activeIpLockId, rating);
      }

      setSubmitted(true);
      setComment('');
    } catch (err: any) {
      console.error("Error submitting review in chat:", err);
      alert("حدث خطأ أثناء إرسال التقييم. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isOwner) {
    return (
      <div className="my-2 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-right block max-w-sm">
        <div className="flex items-center gap-2 text-stone-800 text-xs font-bold">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
          <span>دعوة تقييم المحل لـ {businessName}</span>
        </div>
      </div>
    );
  }

  if (submitted || hasExistingReview) {
    return (
      <div className="my-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-right text-emerald-900 block max-w-sm">
        <div className="flex items-center gap-2 font-bold text-xs">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>تم تسجيل تقييمك بنجاح، شكراً لمشاركتك</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 p-3.5 bg-white border border-stone-200 rounded-xl text-right shadow-2xs max-w-sm block">
      <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs border-b border-stone-100 pb-2 mb-2.5">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
        <span>دعوة لتقييم {businessName}</span>
      </div>

      <div className="flex items-center gap-1 mb-2.5 justify-start">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-1 text-stone-300 hover:text-amber-400 cursor-pointer transition-colors"
          >
            <Star className={`h-5 w-5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="اكتب تقييمك ورأيك..."
        rows={2}
        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] mb-2 text-stone-900"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        <span>إرسال التقييم</span>
      </button>
    </div>
  );
}

// Component for Google Maps Card in Chat ensuring exact pin resolution matching BusinessDetail.tsx
function ChatGoogleMapCard({
  googleUrl,
  businessName,
  initialEmbedUrl,
  activeBiz
}: {
  googleUrl: string;
  businessName: string;
  initialEmbedUrl?: string;
  activeBiz?: Business | null;
}) {
  const [embedUrl, setEmbedUrl] = useState<string>(() => {
    if (initialEmbedUrl) return initialEmbedUrl;
    if (activeBiz) {
      const immediate = getGoogleMapsEmbedUrl(activeBiz);
      if (immediate) return immediate;
    }
    const fromUrl = extractCoordsOrEmbedFromUrl(googleUrl);
    if (fromUrl) return fromUrl;
    if (activeBiz?.latitude && activeBiz?.longitude) {
      return `https://maps.google.com/maps?q=${activeBiz.latitude},${activeBiz.longitude}&hl=ar&z=16&output=embed`;
    }
    return '';
  });

  useEffect(() => {
    let isMounted = true;
    const rawUrl = (activeBiz?.googlePlaceUrl || googleUrl || '').trim();
    if (!rawUrl) return;

    // 1. Direct immediate resolution
    if (activeBiz) {
      const immediate = getGoogleMapsEmbedUrl(activeBiz);
      if (immediate) {
        setEmbedUrl(immediate);
        return;
      }
    }
    const parsedImmediate = extractCoordsOrEmbedFromUrl(rawUrl);
    if (parsedImmediate) {
      setEmbedUrl(parsedImmediate);
      return;
    }

    // 2. Fallback to business exact coordinates if available
    if (activeBiz?.latitude && activeBiz?.longitude) {
      setEmbedUrl(`https://maps.google.com/maps?q=${activeBiz.latitude},${activeBiz.longitude}&hl=ar&z=16&output=embed`);
      return;
    }

    // 3. Resolve short URLs (maps.app.goo.gl, etc.) via backend exactly like BusinessDetail
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const cacheKey = `resolved_map_embed_${rawUrl}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setEmbedUrl(cached);
          return;
        }
      } catch (e) {}

      fetch(`/api/resolve-map-url?url=${encodeURIComponent(rawUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.lat && data.lng) {
            const embed = `https://maps.google.com/maps?q=${data.lat},${data.lng}&hl=ar&z=16&output=embed`;
            setEmbedUrl(embed);
            try { sessionStorage.setItem(cacheKey, embed); } catch (e) {}
          } else if (data.finalUrl) {
            const parsed = extractCoordsOrEmbedFromUrl(data.finalUrl);
            if (parsed) {
              setEmbedUrl(parsed);
              try { sessionStorage.setItem(cacheKey, parsed); } catch (e) {}
            }
          } else if (data.query) {
            const embed = `https://maps.google.com/maps?q=${encodeURIComponent(data.query + ' إربد')}&hl=ar&z=16&output=embed`;
            setEmbedUrl(embed);
            try { sessionStorage.setItem(cacheKey, embed); } catch (e) {}
          }
        })
        .catch((err) => {
          console.warn('Error resolving map url in chat:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [googleUrl, activeBiz?.googlePlaceUrl, activeBiz?.latitude, activeBiz?.longitude]);

  return (
    <div className="my-2.5 w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden border border-stone-200 shadow-2xs bg-stone-100 relative text-right block">
      {embedUrl ? (
        <iframe
          title={`خريطة ${businessName}`}
          width="100%"
          height="160"
          className="w-full h-40 border-0 block"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
        />
      ) : (
        <div className="w-full h-40 bg-stone-100 flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-stone-400 animate-spin" />
        </div>
      )}
      <div className="p-2.5 bg-white flex items-center justify-between border-t border-stone-200">
        <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5 truncate max-w-[65%]">
          <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="truncate">موقع المحل على الخريطة</span>
        </span>
        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors shrink-0"
          >
            <span>فتح الخريطة</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

interface PendingAttachment {
  id: string;
  tag: string;
  type: 'contact-phone' | 'contact-whatsapp' | 'map-interactive' | 'map-google' | 'business' | 'product' | 'offer' | 'job' | 'review-invite';
  title: string;
}

function getTagAttachmentInfo(tag: string): PendingAttachment {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (tag.startsWith('[mention-contact:phone:')) {
    const parts = tag.slice(1, -1).split(':');
    const phone = parts[2] || '';
    return { id, tag, type: 'contact-phone', title: `رقم الهاتف: ${phone}` };
  }
  if (tag.startsWith('[mention-contact:whatsapp:')) {
    const parts = tag.slice(1, -1).split(':');
    const wa = parts[2] || '';
    return { id, tag, type: 'contact-whatsapp', title: `واتساب: ${wa}` };
  }
  if (tag.startsWith('[mention-map:interactive:')) {
    return { id, tag, type: 'map-interactive', title: 'الخريطة التفاعلية' };
  }
  if (tag.startsWith('[mention-map:google:')) {
    return { id, tag, type: 'map-google', title: 'خرائط Google' };
  }
  if (tag.startsWith('[mention-business:')) {
    const parts = tag.slice(1, -1).split(':');
    const name = parts[2] ? decodeURIComponent(parts[2]) : 'صفحة المنشأة';
    return { id, tag, type: 'business', title: `بطاقة المنشأة: ${name}` };
  }
  if (tag.startsWith('[mention-product:')) {
    const parts = tag.slice(1, -1).split(':');
    const name = parts[1] ? decodeURIComponent(parts[1]) : 'منتج أو خدمة';
    return { id, tag, type: 'product', title: `منتج/خدمة: ${name}` };
  }
  if (tag.startsWith('[mention-offer:')) {
    const parts = tag.slice(1, -1).split(':');
    const title = parts[2] ? decodeURIComponent(parts[2]) : 'عرض ترويجي';
    return { id, tag, type: 'offer', title: `عرض: ${title}` };
  }
  if (tag.startsWith('[mention-job:')) {
    const parts = tag.slice(1, -1).split(':');
    const title = parts[2] ? decodeURIComponent(parts[2]) : 'وظيفة معلنة';
    return { id, tag, type: 'job', title: `وظيفة: ${title}` };
  }
  if (tag.startsWith('[mention-review-invite:')) {
    return { id, tag, type: 'review-invite', title: 'دعوة لتقييم المحل' };
  }

  return { id, tag, type: 'business', title: 'مرفق' };
}

function getPillIcon(type: string) {
  switch (type) {
    case 'contact-phone':
      return <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
    case 'contact-whatsapp':
      return <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
    case 'map-interactive':
      return <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
    case 'map-google':
      return <MapIcon className="h-3.5 w-3.5 text-stone-700 shrink-0" />;
    case 'business':
      return <Store className="h-3.5 w-3.5 text-[#1a4d2e] shrink-0" />;
    case 'product':
      return <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
    case 'offer':
      return <Tag className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
    case 'job':
      return <Briefcase className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
    case 'review-invite':
      return <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />;
    default:
      return <AtSign className="h-3.5 w-3.5 text-stone-600 shrink-0" />;
  }
}

function getPillStyle(type: string) {
  switch (type) {
    case 'contact-phone':
      return 'bg-blue-50/90 border-blue-200 text-blue-950';
    case 'contact-whatsapp':
      return 'bg-emerald-50/90 border-emerald-200 text-emerald-950';
    case 'map-interactive':
      return 'bg-amber-50/90 border-amber-200 text-amber-950';
    case 'map-google':
      return 'bg-stone-100 border-stone-300 text-stone-900';
    case 'business':
      return 'bg-emerald-50/90 border-emerald-200 text-emerald-950';
    case 'product':
      return 'bg-amber-50/90 border-amber-200 text-amber-950';
    case 'offer':
      return 'bg-purple-50/90 border-purple-200 text-purple-950';
    case 'job':
      return 'bg-blue-50/90 border-blue-200 text-blue-950';
    case 'review-invite':
      return 'bg-amber-50/90 border-amber-300 text-amber-950';
    default:
      return 'bg-stone-50 border-stone-200 text-stone-800';
  }
}

export function Messages() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetBusinessId = searchParams.get('businessId');
  const { confirm } = useConfirm();

  // Automatic redirect if guest
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [currentUser, navigate, location]);

  // Unified lists
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  
  // Loading & interactive state
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Deletion & Editing state
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<ChatMessage | null>(null);
  const [deletingType, setDeletingType] = useState<'me' | 'everyone' | null>(null);
  
  // Mentions state
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [mentionOffers, setMentionOffers] = useState<any[]>([]);
  const [mentionJobs, setMentionJobs] = useState<any[]>([]);
  const [loadingMentionData, setLoadingMentionData] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  
  // Business details for active room
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loadingActiveBusiness, setLoadingActiveBusiness] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activePane, setActivePane] = useState<'list' | 'chat'>('list'); // responsive view
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'merchant'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 11. Parse custom mentions in message text into interactive styled badges & cards
  const parseMessageMentions = (text: string) => {
    if (!text) return text;
    
    const regex = /(\[mention-(?:business|product|offer|job|contact|map|review-invite):[^\]]+\])/g;
    const parts = text.split(regex);
    const isOwnerOfActive = Boolean(activeRoom && (ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid));
    
    return parts.map((part, idx) => {
      if (part.startsWith('[mention-') && part.endsWith(']')) {
        const content = part.slice(1, -1);
        const [typeAndPrefix, ...rest] = content.split(':');
        const type = typeAndPrefix.replace('mention-', '');
        
        if (type === 'contact') {
          const [contactType, phone, name] = rest;
          if (contactType === 'phone') {
            return (
              <a 
                key={idx} 
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-xl mx-1 font-bold text-xs transition-all shadow-2xs my-1"
              >
                <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>اتصال: {phone}</span>
              </a>
            );
          }
          if (contactType === 'whatsapp') {
            return (
              <a 
                key={idx} 
                href={getWhatsAppUrl(phone, `مرحباً ${name || ''}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-xl mx-1 font-bold text-xs transition-all shadow-2xs my-1"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>واتساب: {phone}</span>
              </a>
            );
          }
        }

        if (type === 'map') {
          const [mapType, idOrUrl, rawName, rawParamA, rawParamB] = rest;
          if (mapType === 'interactive') {
            const name = rawName ? decodeURIComponent(rawName) : (activeBusiness?.name || activeRoom?.businessName || 'المحل');
            const lat = rawParamA || activeBusiness?.latitude || '';
            const lng = rawParamB || activeBusiness?.longitude || '';
            const hasCoords = Boolean(lat && lng);

            return (
              <div 
                key={idx} 
                className="my-2.5 w-full max-w-sm sm:max-w-md bg-white rounded-2xl overflow-hidden border border-amber-200/90 shadow-2xs hover:shadow-md transition-all text-right block"
              >
                <div className="relative w-full h-36 bg-gradient-to-br from-amber-50 via-stone-100 to-emerald-50 overflow-hidden flex items-center justify-center border-b border-amber-100">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#1a4d2e_1.5px,transparent_1.5px)] [background-size:14px_14px]" />
                  {hasCoords ? (
                    <iframe
                      title={`الخريطة التفاعلية ${name}`}
                      width="100%"
                      height="144"
                      className="w-full h-36 border-0 block pointer-events-none opacity-90"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=15&output=embed`}
                    />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-md mb-1.5">
                        <MapPin className="h-5 w-5 text-amber-400" />
                      </div>
                      <span className="text-xs font-black text-stone-900 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-stone-200 shadow-2xs">
                        دبوس المنشأة على الخريطة التفاعلية
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-white flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 truncate">
                      <MapPin className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5 font-bold">الخريطة التفاعلية</p>
                  </div>
                  <Link
                    to={`/interactive-map?businessId=${idOrUrl}`}
                    className="px-3 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 flex items-center gap-1"
                  >
                    <span>عرض على الخريطة</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          }

          if (mapType === 'google') {
            const googleUrl = idOrUrl ? decodeURIComponent(idOrUrl) : (activeBusiness ? getGoogleMapsActionUrls(activeBusiness).viewUrl : '');
            const name = rawName ? decodeURIComponent(rawName) : (activeBusiness?.name || activeRoom?.businessName || 'المحل');
            const embedUrl = rawParamA ? decodeURIComponent(rawParamA) : '';

            return (
              <ChatGoogleMapCard
                key={idx}
                googleUrl={googleUrl}
                businessName={name}
                initialEmbedUrl={embedUrl}
                activeBiz={activeBusiness}
              />
            );
          }
        }

        if (type === 'business') {
          const [id, rawName, rawLogo, rawCat, rawDistrict, rawRating] = rest;
          const bizName = rawName ? decodeURIComponent(rawName) : (activeBusiness?.name || activeRoom?.businessName || 'المحل');
          const bizLogo = rawLogo ? decodeURIComponent(rawLogo) : (activeBusiness?.logoUrl || (activeBusiness as any)?.profileImage || '');
          const bizCategory = rawCat ? decodeURIComponent(rawCat) : (activeBusiness?.category || '');
          const bizDistrict = rawDistrict ? decodeURIComponent(rawDistrict) : (activeBusiness?.district || activeBusiness?.address || '');
          const bizRating = rawRating ? Number(rawRating) : (activeBusiness?.rating || 0);
          const isVip = Boolean(activeBusiness && getBusinessVipStatus(activeBusiness).isVip);

          return (
            <div 
              key={idx} 
              className="my-2.5 w-full max-w-sm bg-white rounded-2xl p-3.5 border border-stone-200 hover:border-emerald-600/40 shadow-2xs hover:shadow-md transition-all text-right block"
            >
              <div className="flex items-center gap-3">
                {bizLogo ? (
                  <img src={bizLogo} alt={bizName} className="w-13 h-13 rounded-2xl object-cover border border-stone-200/80 shadow-2xs shrink-0" />
                ) : (
                  <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 font-black text-lg shadow-2xs shrink-0">
                    {bizName ? bizName.trim().charAt(0) : <Store className="h-6 w-6 text-emerald-600" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-stone-900 truncate">{bizName}</h4>
                    {isVip && (
                      <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-black px-2 py-0.5 rounded-full shrink-0">
                        موثّق
                      </span>
                    )}
                  </div>
                  {bizCategory && (
                    <span className="inline-block text-[11px] font-bold text-[#1a4d2e] bg-[#1a4d2e]/8 px-2 py-0.5 rounded-md mt-1">
                      {bizCategory}
                    </span>
                  )}
                  {bizDistrict && (
                    <p className="text-[10px] text-stone-500 mt-1 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                      <span>{bizDistrict}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-stone-100 mt-3 pt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs">
                  {bizRating > 0 ? (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-xs font-bold">
                      ⭐ {bizRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-bold">صفحة معتمدة</span>
                  )}
                </div>
                <Link
                  to={`/business/${id}`}
                  className="px-3.5 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1"
                >
                  <span>زيارة المحل</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        }
        
        if (type === 'product') {
          const [rawName, rawPrice, rawImg, rawCat, rawDesc] = rest;
          const name = rawName ? decodeURIComponent(rawName) : '';
          const price = rawPrice ? decodeURIComponent(rawPrice) : '';
          let img = rawImg ? decodeURIComponent(rawImg) : '';
          let cat = rawCat ? decodeURIComponent(rawCat) : '';
          let desc = rawDesc ? decodeURIComponent(rawDesc) : '';

          // Fallback to activeBusiness menu item if available
          if ((!img || !desc) && activeBusiness?.menuItems) {
            const found = activeBusiness.menuItems.find((m: any) => m.name === name);
            if (found) {
              if (!img) img = found.imageUrl || (found as any).image || '';
              if (!desc) desc = found.description || '';
              if (!cat) cat = found.category || '';
            }
          }

          const storeUrl = `/business/${activeRoom?.businessId}?tab=menu`;
          const bizTitle = activeBusiness?.name || activeRoom?.businessName || 'المحل';

          return (
            <Link 
              key={idx} 
              to={storeUrl} 
              className="my-2.5 w-full max-w-sm bg-white rounded-2xl p-3.5 transition-all flex flex-col group relative overflow-hidden border border-stone-200 hover:border-amber-500/50 hover:shadow-md text-right block"
            >
              <div className="flex gap-3">
                {img ? (
                  <img src={img} alt={name} className="w-[76px] h-[76px] rounded-xl object-cover border border-stone-100 shrink-0 shadow-2xs" />
                ) : (
                  <div className="w-[76px] h-[76px] rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-stone-400 shrink-0 shadow-2xs">
                    <ShoppingBag className="h-6 w-6 text-amber-600" />
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <h4 className="font-black text-sm text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">{name}</h4>
                  </div>
                  {desc && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 mb-2 leading-relaxed flex-1">{desc}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    {price && (
                      <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{price} د.أ</span>
                    )}
                    {cat && (
                      <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">{cat}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-stone-100 mt-2.5 pt-2 flex items-center justify-between text-[10px] font-bold text-stone-500">
                <span className="truncate max-w-[70%] text-stone-600 inline-flex items-center gap-1">
                  <span className="text-stone-400 shrink-0">من:</span> 
                  <span className="truncate">{bizTitle}</span>
                </span>
                <span className="text-amber-600 group-hover:translate-x-1 transition-transform flex items-center shrink-0">
                  عرض الصنف <ChevronLeft className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        }
        
        if (type === 'offer') {
          const [id, rawTitle, rawDiscount, rawImg, rawCat, rawExp, rawDesc] = rest;
          const title = rawTitle ? decodeURIComponent(rawTitle) : '';
          const discount = rawDiscount ? decodeURIComponent(rawDiscount) : '';
          let img = rawImg ? decodeURIComponent(rawImg) : '';
          let cat = rawCat ? decodeURIComponent(rawCat) : '';
          let exp = rawExp ? decodeURIComponent(rawExp) : '';
          let desc = rawDesc ? decodeURIComponent(rawDesc) : '';

          if ((!img || !desc) && mentionOffers.length > 0) {
            const found = mentionOffers.find(o => o.id === id || o.title === title);
            if (found) {
              if (!img) img = found.image || '';
              if (!desc) desc = found.description || '';
              if (!cat) cat = found.category || '';
              if (!exp) exp = found.expiresIn || '';
              if (!discount && found.discountPercentage) (found as any).discountPercentage;
            }
          }

          const bizTitle = activeBusiness?.name || activeRoom?.businessName || 'المحل';

          return (
            <Link 
              key={idx} 
              to={`/business/${activeRoom?.businessId}`} 
              className="my-2.5 w-full max-w-sm bg-white rounded-2xl overflow-hidden transition-all flex flex-col group relative border border-stone-200 hover:border-red-500/50 hover:shadow-md text-right block"
            >
              <div className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden shrink-0">
                {img ? (
                  <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center text-red-400">
                    <Tag className="h-10 w-10 text-red-400" />
                  </div>
                )}
                {discount && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <div className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 animate-pulse" />
                      <span>خصم %{discount}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    {cat && <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-bold">{cat}</span>}
                    {exp && <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> {exp}</span>}
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-stone-800 line-clamp-1 group-hover:text-red-600 transition-colors">{title}</h4>
                  {desc && <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{desc}</p>}
                </div>
                <div className="border-t border-stone-100 mt-3 pt-2.5 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-stone-700 font-black truncate pr-2 flex-1"><span className="text-stone-400 font-medium">مقدم من:</span> {bizTitle}</span>
                  <span className="text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">التفاصيل <ChevronLeft className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </Link>
          );
        }
        
        if (type === 'job') {
          const [id, rawTitle, rawComp, rawCat, rawType, rawLoc, rawDesc] = rest;
          const title = rawTitle ? decodeURIComponent(rawTitle) : '';
          const comp = rawComp ? decodeURIComponent(rawComp) : (activeBusiness?.name || activeRoom?.businessName || 'المنشأة');
          let cat = rawCat ? decodeURIComponent(rawCat) : '';
          let jobType = rawType ? decodeURIComponent(rawType) : '';
          let loc = rawLoc ? decodeURIComponent(rawLoc) : (activeBusiness?.district || 'إربد');
          let desc = rawDesc ? decodeURIComponent(rawDesc) : '';

          if (!desc && mentionJobs.length > 0) {
            const found = mentionJobs.find(j => j.id === id || j.title === title);
            if (found) {
              if (!desc) desc = found.description || '';
              if (!cat) cat = found.category || '';
              if (!jobType) jobType = found.jobType || '';
              if (!loc) loc = found.location || '';
            }
          }

          return (
            <Link 
              key={idx} 
              to="/jobs" 
              className="my-2.5 w-full max-w-sm bg-white rounded-2xl p-4 transition-all flex flex-col group relative border border-stone-200 hover:border-teal-500/50 hover:shadow-md text-right block"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cat && <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">{cat}</span>}
                  {jobType && <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">{jobType}</span>}
                </div>
              </div>
              <h4 className="font-black text-sm sm:text-base text-stone-800 line-clamp-1 group-hover:text-teal-700 transition-colors">{title}</h4>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1.5 font-bold">
                <Briefcase className="h-3.5 w-3.5 text-stone-400 shrink-0" /> <span>{comp}</span>
              </div>
              {desc && (
                <p className="text-xs text-stone-500 line-clamp-2 mt-2 leading-relaxed flex-1">{desc}</p>
              )}
              <div className="border-t border-stone-100 mt-3 pt-2.5 flex items-center justify-between text-xs font-bold">
                <span className="text-stone-500 flex items-center gap-1"><MapPin className="h-3 w-3 text-stone-400" /> {loc}</span>
                <span className="text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">قدّم الآن <ChevronLeft className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
          );
        }

        if (type === 'review-invite') {
          const [bizId, rawBizName] = rest;
          const bizName = rawBizName ? decodeURIComponent(rawBizName) : (activeBusiness?.name || activeRoom?.businessName || 'المحل');
          return (
            <ChatReviewInviteBox
              key={idx}
              businessId={bizId}
              businessName={bizName}
              isOwner={isOwnerOfActive}
            />
          );
        }
      }
      return part;
    });
  };

  // Check window width for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Fetch user owned businesses to distinguish roles
  useEffect(() => {
    async function fetchOwnedBusinesses() {
      if (!currentUser || !db) return;
      try {
        const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const list: Business[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Business);
        });
        setOwnedBusinesses(list);
      } catch (err) {
        console.error("Error fetching owned businesses:", err);
      }
    }
    fetchOwnedBusinesses();
  }, [currentUser]);

  // 2. Fetch/Subscribe to Chat Rooms
  useEffect(() => {
    if (!currentUser || !db) {
      setLoadingRooms(false);
      return;
    }

    // Since we need to show both chats started as a customer AND chats received as business owners:
    // We fetch rooms where userId == currentUser.uid, OR where businessOwnerId == currentUser.uid
    // To avoid complex composite indexes, we can perform two simple queries and merge them in real-time.
    let unsubscribeUser = () => {};
    let unsubscribeOwner = () => {};
    let userList: ChatRoom[] = [];
    let ownerList: ChatRoom[] = [];

    const updateCombinedRooms = () => {
      const mergedMap = new Map<string, ChatRoom>();
      userList.forEach(room => mergedMap.set(room.id, room));
      ownerList.forEach(room => mergedMap.set(room.id, room));

      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      setChatRooms(mergedList);
      setLoadingRooms(false);
    };

    try {
      const userRoomsQuery = query(
        collection(db, 'chatRooms'),
        where('userId', '==', currentUser.uid),
        limit(40)
      );

      unsubscribeUser = onSnapshot(userRoomsQuery, (snapshot) => {
        userList = [];
        snapshot.forEach((d) => {
          userList.push({ id: d.id, ...d.data() } as ChatRoom);
        });
        updateCombinedRooms();
      }, (err) => {
        console.error("User chat rooms subscription error:", err);
        setLoadingRooms(false);
      });

      const ownerRoomsQuery = query(
        collection(db, 'chatRooms'),
        where('businessOwnerId', '==', currentUser.uid),
        limit(40)
      );

      unsubscribeOwner = onSnapshot(ownerRoomsQuery, (ownerSnapshot) => {
        ownerList = [];
        ownerSnapshot.forEach((d) => {
          ownerList.push({ id: d.id, ...d.data() } as ChatRoom);
        });
        updateCombinedRooms();
      }, (err) => {
        console.error("Owner chat rooms subscription error:", err);
        setLoadingRooms(false);
      });

    } catch (error) {
      console.error("Error setting up chat rooms listener:", error);
      setLoadingRooms(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeOwner();
    };
  }, [currentUser]);

  // 3. Handle specific creation of room if businessId is provided in URL
  useEffect(() => {
    async function checkAndCreateTargetRoom() {
      if (!currentUser || !db || !targetBusinessId) return;

      // Check if room already exists: businessId_userId
      const roomId = `${targetBusinessId}_${currentUser.uid}`;
      const roomRef = doc(db, 'chatRooms', roomId);
      
      try {
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
          // Room exists, open it
          const roomData = { id: docSnap.id, ...docSnap.data() } as ChatRoom;
          setActiveRoom(roomData);
          setActivePane('chat');
        } else {
          // Room does not exist, check if business exists and is Gold/VIP
          const bizRef = doc(db, 'businesses', targetBusinessId);
          const bizSnap = await getDoc(bizRef);
          
          if (bizSnap.exists()) {
            const biz = { id: bizSnap.id, ...bizSnap.data() } as Business;
            
            // Strictly check if business is active Golden/VIP plan
            const isEligible = canUseLiveChat(biz);
            
            if (!isEligible) {
              setSearchParams({});
              return;
            }

            // Create new Chat Room
            const newRoom: ChatRoom = {
              id: roomId,
              businessId: biz.id,
              businessName: biz.name,
              userId: currentUser.uid,
              userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'زبون',
              userEmail: currentUser.email || '',
              lastMessageText: 'بدء المحادثة الجديدة...',
              lastMessageTime: Date.now(),
              unreadByBusiness: true,
              unreadByUser: false,
              businessOwnerId: biz.userId || ''
            };

            await setDoc(roomRef, newRoom);
            setActiveRoom(newRoom);
            setActivePane('chat');
          }
        }
      } catch (err) {
        console.error("Error checking/creating target room:", err);
      }
    }

    checkAndCreateTargetRoom();
  }, [targetBusinessId, currentUser]);

  // 4. Load/Subscribe to active room's messages & business details
  useEffect(() => {
    if (!activeRoom || !db) {
      setMessages([]);
      setActiveBusiness(null);
      setLoadingActiveBusiness(false);
      return;
    }

    setLoadingMessages(true);
    setLoadingActiveBusiness(true);

    // Fetch active business details once when opening room
    const bizRef = doc(db, 'businesses', activeRoom.businessId);
    getDoc(bizRef).then((snap) => {
      if (snap.exists()) {
        setActiveBusiness({ id: snap.id, ...snap.data() } as Business);
      } else {
        setActiveBusiness(null);
      }
      setLoadingActiveBusiness(false);
    }).catch((err) => {
      console.error("Error fetching business for chat room:", err);
      setLoadingActiveBusiness(false);
    });

    // Mark messages as read based on role
    const isOwnerOfActive = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid;
    const updateField = isOwnerOfActive ? { unreadByBusiness: false } : { unreadByUser: false };
    
    updateDoc(doc(db, 'chatRooms', activeRoom.id), updateField).catch(e => console.error("Error updating read status:", e));

    // Subscribe to messages
    const messagesQuery = query(
      collection(db, 'chatRooms', activeRoom.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      const now = Date.now();
      
      snapshot.forEach((d) => {
        const msg = { id: d.id, ...d.data() } as ChatMessage;
        
        // FILTER: Disappearing messages logic & deleted for this user
        const isDeletedForMe = msg.deletedForUsers?.includes(currentUser?.uid || '');
        if ((!msg.expiresAt || msg.expiresAt > now) && !isDeletedForMe) {
          list.push(msg);
        }
      });

      setMessages(list);
      setLoadingMessages(false);
      // Scroll localized container to bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }, (err) => {
      console.error("Error fetching messages:", err);
      setLoadingMessages(false);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [activeRoom, ownedBusinesses, currentUser]);

  // Scroll messages smoothly or instantly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Keep scroll pinned to bottom whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
      const timer = setTimeout(() => scrollToBottom('smooth'), 80);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Handle file select & crop modal opening
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const secCheck = validateFileSecurity(file, 'image');
    if (!secCheck.valid) {
      alert(secCheck.error || 'الملف المحدد غير آمن.');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      alert("حجم ملف الصورة كبير جداً! الحد الأقصى المسموح به للمرفقات هو 1 ميغابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setSelectedFileName(file.name);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File, croppedDataUrl: string) => {
    setSelectedFile(croppedDataUrl);
    setCropModalOpen(false);
  };

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db || !activeRoom) return;

    // Strict VIP check: disable messaging if business is not active VIP
    const activeVip = getBusinessVipStatus(activeBusiness);
    if (!activeVip.isVip) return;

    const trimmedText = inputText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!trimmedText && !selectedFile && !hasAttachments) return;

    const isOwner = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser.uid;
    
    // Check retention and media limits based on Business Premium Messaging add-on status
    const isPremiumMessaging = Boolean(activeBusiness?.premiumMessagingEnabled);
    
    // retention period: 7 days default, or based on plan
    let retentionMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (isPremiumMessaging && activeBusiness?.premiumMessagingPlan) {
      const plan = activeBusiness.premiumMessagingPlan;
      if (plan === '1_month') retentionMs = 30 * 24 * 60 * 60 * 1000;
      else if (plan === '3_months') retentionMs = 90 * 24 * 60 * 60 * 1000;
      else if (plan === '6_months') retentionMs = 180 * 24 * 60 * 60 * 1000;
      else if (plan === '1_year') retentionMs = 365 * 24 * 60 * 60 * 1000;
    }

    const expiresAt = Date.now() + retentionMs;

    try {
      let finalMessageText = trimmedText;
      if (hasAttachments) {
        const attachmentsContent = pendingAttachments.map(a => a.tag).join('\n\n');
        finalMessageText = finalMessageText ? `${finalMessageText}\n\n${attachmentsContent}` : attachmentsContent;
      }

      const msgData: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        senderType: isOwner ? 'business' : 'customer',
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
        text: finalMessageText,
        createdAt: Date.now(),
        expiresAt: expiresAt
      };

      // Add media if premium messaging is enabled and file selected
      if (selectedFile) {
        if (isPremiumMessaging) {
          msgData.mediaUrl = selectedFile;
          msgData.mediaType = 'image';
        } else {
          alert("الوسائط غير مدعومة في الحسابات العادية. يجب على صاحب المحل ترقية الخدمة لاستقبال وإرسال الوسائط.");
          setSelectedFile(null);
          setSelectedFileName(null);
          return;
        }
      }

      // Add to messages sub-collection
      const messagesRef = collection(db, 'chatRooms', activeRoom.id, 'messages');
      await addDoc(messagesRef, msgData);

      // Update parent ChatRoom document
      let previewText = trimmedText;
      if (!previewText && hasAttachments) {
        previewText = pendingAttachments.map(a => a.title).join('، ');
      }
      if (!previewText && selectedFile) {
        previewText = 'أرسل صورة 📷';
      }

      const roomRef = doc(db, 'chatRooms', activeRoom.id);
      await updateDoc(roomRef, {
        lastMessageText: previewText || 'رسالة جديدة',
        lastMessageTime: Date.now(),
        unreadByBusiness: !isOwner,
        unreadByUser: isOwner,
      });

      setInputText('');
      setPendingAttachments([]);
      setSelectedFile(null);
      setSelectedFileName(null);
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const getRetentionLabel = (biz: Business | null) => {
    if (!biz) return '7 أيام';
    if (!biz.premiumMessagingEnabled) return 'أسبوع واحد فقط';
    
    switch (biz.premiumMessagingPlan) {
      case '1_month': return 'شهر كامل';
      case '3_months': return '3 أشهر';
      case '6_months': return '6 أشهر';
      case '1_year': return 'سنة كاملة';
      default: return 'أسبوع واحد';
    }
  };

  // 6. Delete entire conversation
  const handleDeleteConversation = async (targetRoomId?: string) => {
    const roomId = targetRoomId || activeRoom?.id;
    if (!roomId || !db || !currentUser) return;

    const ok = await confirm({
      title: 'حذف المحادثة بالكامل',
      message: 'هل أنت متأكد من رغبتك في حذف هذه المحادثة بالكامل؟ سيتم مسح كافة الرسائل وسجل الدردشة نهائياً ولا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'نعم، احذف المحادثة',
      cancelText: 'تراجع',
      variant: 'danger'
    });

    if (!ok) return;

    try {
      setDeletingRoom(true);
      // Delete all messages in the subcollection
      const messagesSnap = await getDocs(collection(db, 'chatRooms', roomId, 'messages'));
      const deletePromises = messagesSnap.docs.map((docSnap) => 
        deleteDoc(doc(db, 'chatRooms', roomId, 'messages', docSnap.id))
      );
      await Promise.all(deletePromises);

      // Delete the chat room document
      await deleteDoc(doc(db, 'chatRooms', roomId));

      // Update local state
      setChatRooms(prev => prev.filter(r => r.id !== roomId));
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
        setMessages([]);
        setSearchParams({});
        if (isMobileView) {
          setActivePane('list');
        }
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      alert("حدث خطأ أثناء محاولة حذف المحادثة. يرجى المحاولة لاحقاً.");
    } finally {
      setDeletingRoom(false);
    }
  };

  // 7. Delete individual message workflow
  const handleDeleteMessageClick = (msg: ChatMessage) => {
    setDeleteTargetMessage(msg);
  };

  const handleConfirmDeleteMessage = async (type: 'me' | 'everyone') => {
    if (!deleteTargetMessage || !activeRoom || !db || !currentUser) return;

    try {
      setDeletingMessageId(deleteTargetMessage.id);
      setDeletingType(type);

      if (type === 'me') {
        // Hide message for this user only
        await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', deleteTargetMessage.id), {
          deletedForUsers: arrayUnion(currentUser.uid)
        });
      } else {
        // Delete message for everyone
        await deleteDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', deleteTargetMessage.id));

        // If deleted message was the last message, update the room's preview text
        const remaining = messages.filter(m => m.id !== deleteTargetMessage.id);
        const newLastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;

        await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
          lastMessageText: newLastMsg ? (newLastMsg.text || 'أرسل صورة 📷') : 'لا توجد رسائل',
          lastMessageTime: newLastMsg ? newLastMsg.createdAt : Date.now(),
        });
      }

      setDeleteTargetMessage(null);
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("حدث خطأ أثناء محاولة حذف الرسالة.");
    } finally {
      setDeletingMessageId(null);
      setDeletingType(null);
    }
  };

  // Mentions Handlers
  const handleOpenMentionModal = async () => {
    if (!activeRoom || !db) return;
    setMentionModalOpen(true);
    setLoadingMentionData(true);
    try {
      // 1. Get offers
      const offersSnap = await getDocs(query(
        collection(db, 'offers'),
        where('businessId', '==', activeRoom.businessId)
      ));
      setMentionOffers(offersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Get jobs
      const jobsSnap = await getDocs(query(
        collection(db, 'jobs'),
        where('businessId', '==', activeRoom.businessId)
      ));
      setMentionJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error loading mention items:", err);
    } finally {
      setLoadingMentionData(false);
    }
  };

  const handleSelectMention = (tag: string) => {
    const info = getTagAttachmentInfo(tag);
    setPendingAttachments((prev) => {
      if (prev.some(item => item.tag === tag)) return prev;
      return [...prev, info];
    });
    setMentionModalOpen(false);
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter(item => item.id !== id));
  };

  // 8. Start editing message
  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text || '');
  };

  // 9. Cancel editing message
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // 10. Save edited message
  const handleSaveEdit = async (msgId: string) => {
    if (!activeRoom || !db || !currentUser) return;

    // Strict VIP check
    const activeVip = getBusinessVipStatus(activeBusiness);
    if (!activeVip.isVip) return;

    const trimmed = editingText.trim();
    if (!trimmed) {
      alert("لا يمكن حفظ رسالة فارغة. يمكنك حذف الرسالة إذا أردت إزالتها.");
      return;
    }

    const currentMsg = messages.find(m => m.id === msgId);
    if (currentMsg && currentMsg.text === trimmed) {
      // Nothing changed
      handleCancelEdit();
      return;
    }

    try {
      setIsSavingEdit(true);
      await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', msgId), {
        text: trimmed,
        isEdited: true,
        editedAt: Date.now()
      });

      // If it's the last message in room, update lastMessageText on chatRoom
      if (messages.length > 0 && messages[messages.length - 1].id === msgId) {
        await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
          lastMessageText: trimmed,
        });
      }

      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      console.error("Error updating message:", err);
      alert("حدث خطأ أثناء حفظ التعديل. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full min-h-0" dir="rtl">
      
      {/* Messages Layout Main Panel */}
      <div className="flex-1 w-full bg-white rounded-2xl md:rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden flex flex-col md:flex-row h-full min-h-0">
        
        {/* RIGHT: Conversations List (Hidden on mobile when chat pane is active) */}
        <div className={`w-full md:w-[360px] lg:w-[380px] shrink-0 border-l border-stone-200/80 flex flex-col bg-stone-50/50 h-full min-h-0 overflow-hidden ${
          isMobileView && activePane === 'chat' ? 'hidden' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-stone-200/60 bg-white space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-black text-stone-950 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
                <span>محادثاتي والرسائل</span>
              </h1>
              <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] px-2.5 py-0.5 rounded-full text-[11px] font-black">
                {chatRooms.length} محادثة
              </span>
            </div>

            {/* Role Filter Tabs if user owns businesses */}
            {ownedBusinesses.length > 0 && (
              <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    roleFilter === 'all' ? 'bg-white shadow-2xs text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('customer')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'customer' ? 'bg-white shadow-2xs text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span>كزبون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('merchant')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    roleFilter === 'merchant' ? 'bg-white shadow-2xs text-[#ff9f1c] font-black' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Store className="h-3 w-3" />
                  <span>لمحلاتي</span>
                </button>
              </div>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 min-h-0 overscroll-contain">
            {loadingRooms ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin mx-auto mb-3"></div>
                <span className="text-xs text-stone-400 font-bold">جاري تحميل المحادثات...</span>
              </div>
            ) : chatRooms.filter(room => {
              const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
              if (roleFilter === 'customer') return !isOwner;
              if (roleFilter === 'merchant') return isOwner;
              return true;
            }).length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-3">
                <MessageCircle className="h-12 w-12 text-stone-300 mx-auto" />
                <p className="text-xs font-bold leading-relaxed">
                  {roleFilter === 'merchant' 
                    ? 'لا توجد استفسارات مرسلة لمحلاتك التجارية حالياً.' 
                    : roleFilter === 'customer' 
                    ? 'لم تقم ببدء أي محادثات مع محلات إربد كزبون بعد.' 
                    : 'لا توجد محادثات نشطة حالياً.'}
                </p>
                <p className="text-[11px] leading-relaxed text-stone-400">
                  يمكنك مراسلة أي متجر أو مطعم معتمد في الباقة الذهبية VIP بسهولة وسرية تامة.
                </p>
                <Link to="/" className="inline-block mt-3 px-4 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-[11px] font-bold rounded-lg transition-colors">
                  تصفح الدليل الآن
                </Link>
              </div>
            ) : (
              chatRooms.filter(room => {
                const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
                if (roleFilter === 'customer') return !isOwner;
                if (roleFilter === 'merchant') return isOwner;
                return true;
              }).map((room) => {
                const isOwner = ownedBusinesses.some(b => b.id === room.businessId) || room.businessOwnerId === currentUser?.uid;
                const isActive = activeRoom?.id === room.id;
                const hasUnread = isOwner ? room.unreadByBusiness : room.unreadByUser;

                return (
                  <div
                    key={room.id}
                    className={`group relative w-full text-right transition-all flex items-center border-r-4 ${
                      isActive 
                        ? 'bg-emerald-50/50 border-r-[#1a4d2e]' 
                        : 'border-r-transparent bg-white hover:bg-stone-50/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoom(room);
                        setPendingAttachments([]);
                        setInputText('');
                        setSearchParams({ roomId: room.id });
                        setActivePane('chat');
                      }}
                      className="flex-1 text-right p-4 flex items-center gap-3.5 cursor-pointer min-w-0"
                    >
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isOwner ? 'bg-[#ff9f1c]/10 text-[#ff9f1c]' : 'bg-[#1a4d2e]/10 text-[#1a4d2e]'
                      }`}>
                        {isOwner ? <User className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </div>

                      {/* Meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-1">
                          <span className={`text-sm block truncate font-black ${hasUnread ? 'text-stone-900' : 'text-stone-700'}`}>
                            {isOwner ? room.userName : room.businessName}
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0 font-bold">
                            {formatDistanceToNow(room.lastMessageTime, { addSuffix: false, locale: ar })}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${hasUnread ? 'text-stone-800 font-bold' : 'text-stone-400'}`}>
                            {room.lastMessageText}
                          </p>
                          
                          {hasUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 shadow-xs animate-ping"></span>
                          )}
                        </div>

                        {/* Display small badge if the conversation is with their owned business */}
                        {isOwner && (
                          <span className="inline-block mt-1 text-[9px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                            رسالة مستلمة لـ {room.businessName}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Quick delete conversation button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(room.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 ml-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                      title="حذف المحادثة بالكامل"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT: Active Chat Pane (Full screen on mobile when active) */}
        <div className={`flex-1 flex flex-col bg-white h-full min-h-0 overflow-hidden ${
          isMobileView && activePane === 'list' 
            ? 'hidden' 
            : isMobileView && activePane === 'chat'
            ? 'fixed inset-0 z-[150] bg-[#fbfbfa] flex flex-col h-[100dvh]'
            : 'flex'
        }`}>
          {activeRoom ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-white sm:bg-stone-50/50 flex items-center justify-between gap-3 shrink-0 shadow-xs sm:shadow-none pt-[max(0.875rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Back button on mobile */}
                  {isMobileView && (
                    <button 
                      onClick={() => setActivePane('list')}
                      className="p-2 hover:bg-stone-100 rounded-xl text-stone-700 active:scale-95 transition-all shrink-0 cursor-pointer"
                      title="العودة للقائمة"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid ? (
                      <User className="h-4.5 w-4.5" />
                    ) : (
                      <Store className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-stone-900 leading-none truncate">
                      {ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid ? (
                        activeRoom.userName
                      ) : (
                        activeRoom.businessName
                      )}
                    </h2>
                    
                    {/* Disappearing warning */}
                    {getBusinessVipStatus(activeBusiness).isVip && (
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1 font-bold">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>تختفي الرسائل بعد: </span>
                        <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded-xs">
                          {getRetentionLabel(activeBusiness)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Sub status details for the business owner */}
                  {activeBusiness && getBusinessVipStatus(activeBusiness).isVip && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      {activeBusiness.premiumMessagingEnabled && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black shadow-2xs">
                          <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          باقة الرسائل المطورة مفعلة ✓
                        </span>
                      )}
                    </div>
                  )}

                  {/* Delete Conversation Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation()}
                    disabled={deletingRoom}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-red-200/80 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                    title="حذف المحادثة بالكامل"
                  >
                    {deletingRoom ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
                    <span className="hidden sm:inline">حذف المحادثة</span>
                  </button>
                </div>
              </div>

              {/* Message Bubble Stream Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fdfcfb] space-y-4 min-h-0 overscroll-contain"
              >
                
                {/* Information Callout */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex gap-3 text-stone-600 max-w-2xl mx-auto text-right">
                  <ShieldCheck className="h-5 w-5 text-[#1a4d2e] shrink-0 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">
                    <p>
                      نود إعلامكم بأن جميع الرسائل في هذه الدردشة يتم حذفها تلقائياً وبشكل آمن بعد مرور <span className="text-stone-800 font-black">7 أيام</span> من تاريخ الإرسال.
                    </p>
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin mx-auto mb-3"></div>
                    <span className="text-xs text-stone-400 font-bold">جاري تحميل رسائل المحادثة...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-stone-400">
                    <MessageCircle className="h-14 w-14 text-stone-200 mx-auto mb-3" />
                    <p className="text-sm font-black text-stone-600">ابدأ المحادثة الآن!</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed mt-1">
                      اكتب استفسارك أو طلبك هنا وسيقوم المعنيون بالرد عليك فوراً.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage = msg.senderId === currentUser?.uid;
                    const isEditingThis = editingMessageId === msg.id;
                    const canDelete = true;
                    
                    return (
                      <div 
                        key={msg.id}
                        className={`group flex flex-col max-w-[85%] sm:max-w-[70%] transition-all ${
                          isMyMessage ? 'mr-auto items-end' : 'ml-auto items-start'
                        }`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] text-stone-400 mb-1 px-1 font-bold">
                          {msg.senderName}
                        </span>

                        {/* Bubble */}
                        <div className={`rounded-2xl p-3.5 shadow-2xs break-words w-full transition-all ${
                          isMyMessage 
                            ? 'bg-[#1a4d2e] text-white rounded-tr-none' 
                            : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                        }`}>
                          {isEditingThis ? (
                            /* Inline Edit Mode */
                            <div className="space-y-2.5 text-stone-900 w-full">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                rows={2}
                                className={`w-full p-2.5 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 shadow-inner ${
                                  isMyMessage 
                                    ? 'bg-white text-stone-900 border border-emerald-300 focus:ring-emerald-400' 
                                    : 'bg-stone-50 text-stone-900 border border-stone-300 focus:ring-[#1a4d2e]'
                                }`}
                                autoFocus
                                placeholder="اكتب التعديل هنا..."
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs ${
                                    isMyMessage 
                                      ? 'text-emerald-100 hover:text-white bg-black/20 hover:bg-black/30' 
                                      : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
                                  }`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>إلغاء</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  disabled={isSavingEdit || !editingText.trim()}
                                  className={`px-3 py-1 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs shadow-xs disabled:opacity-50 ${
                                    isMyMessage 
                                      ? 'bg-emerald-500 hover:bg-emerald-400' 
                                      : 'bg-[#1a4d2e] hover:bg-[#133b22]'
                                  }`}
                                >
                                  {isSavingEdit ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>حفظ التعديل</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Standard Message Display */
                            <>
                              {/* Text message */}
                              {msg.text && (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{parseMessageMentions(msg.text)}</div>
                              )}

                              {/* Media image if any */}
                              {msg.mediaUrl && (
                                <div className="mt-2.5 rounded-xl overflow-hidden border border-stone-200/50 max-h-[220px]">
                                  <img 
                                    src={msg.mediaUrl} 
                                    alt="مرفق محادثة" 
                                    className="w-full h-full object-cover cursor-zoom-in"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Timing Info, "تم التعديل" Badge, & Action Buttons */}
                        <div className={`flex items-center gap-2 text-[10px] text-stone-400 mt-1 px-1 font-bold ${
                          isMyMessage ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          <span>{formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: ar })}</span>
                          
                          {/* "تم التعديل" Badge below edited message */}
                          {msg.isEdited && (
                            <span 
                              className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md shadow-2xs"
                              title={msg.editedAt ? `تم التعديل: ${formatDistanceToNow(msg.editedAt, { addSuffix: true, locale: ar })}` : 'تم التعديل'}
                            >
                              <Pencil className="h-2.5 w-2.5 text-amber-600" />
                              <span>تم التعديل</span>
                            </span>
                          )}

                          {/* Action Buttons for Sender / Admin */}
                          {!isEditingThis && canDelete && (
                            <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                              {isMyMessage && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMessage(msg)}
                                  className="p-1 hover:bg-stone-100 text-stone-400 hover:text-emerald-700 rounded-md transition-colors cursor-pointer"
                                  title="تعديل الرسالة"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteMessageClick(msg)}
                                disabled={deletingMessageId === msg.id}
                                className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="حذف الرسالة"
                              >
                                {deletingMessageId === msg.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Controls Area / Disabled Notice Area */}
              {(() => {
                const isOwnerOfActive = ownedBusinesses.some(b => b.id === activeRoom.businessId) || activeRoom.businessOwnerId === currentUser?.uid;
                const isVisitor = !isOwnerOfActive;
                const isVipActive = getBusinessVipStatus(activeBusiness).isVip;

                if (loadingActiveBusiness) {
                  return (
                    <div className="p-4 border-t border-stone-200 bg-white shrink-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                    </div>
                  );
                }

                if (!isVipActive) {
                  const storeName = activeBusiness?.name || activeRoom.businessName || '';
                  if (isVisitor) {
                    return (
                      <div className="p-4 border-t border-stone-200 bg-stone-50 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
                        <div className="flex items-center justify-center gap-2 text-stone-600">
                          <Lock className="h-4 w-4 text-stone-400 shrink-0" />
                          <span className="text-sm font-bold">
                            قام المحل {storeName} بتعطيل ميزة استقبال الرسائل عبر الموقع
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Store Owner View
                  return (
                    <div className="p-4 border-t border-stone-200 bg-amber-50/60 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
                        <div className="flex items-center gap-2 text-stone-800">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-sm font-bold">
                            انتهى اشتراكك في الباقة الذهبية
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Crown className="h-4 w-4 text-amber-200 shrink-0" />
                          <span>تجديد الاشتراك</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-stone-200 bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:shadow-none z-20">
                    
                    {/* Show thumbnail of selected media */}
                    {selectedFile && (
                      <div className="mb-2.5 p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-300">
                            <img src={selectedFile} alt="Selected attachment preview" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-stone-600 truncate max-w-[200px]">{selectedFileName}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setSelectedFile(null); setSelectedFileName(null); }}
                          className="p-1 hover:bg-stone-200 rounded-full text-red-500 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Pending Mentions / Attachments Pill Buttons Horizontal Scroll Bar */}
                    {pendingAttachments.length > 0 && (
                      <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-200 max-w-full">
                        {pendingAttachments.map((att) => (
                          <div
                            key={att.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 shadow-2xs select-none transition-all ${getPillStyle(att.type)}`}
                          >
                            {getPillIcon(att.type)}
                            <span className="truncate max-w-[180px] sm:max-w-[240px]">{att.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="p-0.5 hover:bg-black/10 rounded-full transition-colors cursor-pointer text-stone-400 hover:text-red-600 shrink-0"
                              title="إزالة المرفق"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      
                      {/* File Upload Trigger */}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {/* Desktop / Tablet File Upload Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeBusiness?.premiumMessagingEnabled) {
                            fileInputRef.current?.click();
                          } else {
                            alert("⚠️ ميزة إرسال مرفقات الصور معطلة لهذا المحل. يجب ترقية خدمة الرسائل للاستفادة من هذه الميزة.");
                          }
                        }}
                        className={`hidden sm:flex items-center justify-center p-3 rounded-xl transition-all border shrink-0 cursor-pointer ${
                          activeBusiness?.premiumMessagingEnabled
                            ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                        }`}
                        title={activeBusiness?.premiumMessagingEnabled ? "إرفاق صورة" : "الوسائط معطلة (تتطلب ترقية الخدمة من صاحب المحل)"}
                      >
                        <ImageIcon className="h-5 w-5" />
                      </button>

                      {/* Desktop / Tablet Mention & Attachments Button */}
                      <button
                        type="button"
                        onClick={handleOpenMentionModal}
                        className={`hidden sm:flex items-center gap-1.5 p-3 rounded-xl transition-all shrink-0 cursor-pointer border ${
                          pendingAttachments.length > 0
                            ? 'bg-emerald-100 text-[#1a4d2e] border-emerald-300 font-black'
                            : 'bg-emerald-50 text-[#1a4d2e] border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="إشارة وإرفاق (تواصل، موقع، بطاقة، منتجات، عروض، وظائف، تقييم)"
                      >
                        <AtSign className="h-5 w-5" />
                        <span className="text-xs font-black">إشارة وإرفاق</span>
                        {pendingAttachments.length > 0 && (
                          <span className="w-4.5 h-4.5 rounded-full bg-[#1a4d2e] text-white text-[10px] font-bold flex items-center justify-center">
                            {pendingAttachments.length}
                          </span>
                        )}
                      </button>

                      {/* Input field wrapper */}
                      <div className="flex-1 min-w-0 relative flex items-center bg-stone-50 border border-stone-200 rounded-xl focus-within:ring-2 focus-within:ring-[#1a4d2e] focus-within:bg-white focus-within:border-transparent transition-all">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={
                            activeBusiness?.premiumMessagingEnabled 
                              ? "اكتب رسالتك النصية أو أرفق صورة..."
                              : "اكتب رسالة نصية فقط..."
                          }
                          className="flex-1 min-w-0 p-3 bg-transparent text-sm focus:outline-none text-stone-800 placeholder:text-stone-400"
                        />

                        {/* Mobile-only iconic buttons inside the text input (no boxes, no borders) */}
                        <div className="flex sm:hidden items-center gap-1 px-2 shrink-0">
                          {/* Attachment Button (Paperclip) */}
                          <button
                            type="button"
                            onClick={handleOpenMentionModal}
                            className={`p-1.5 transition-colors cursor-pointer shrink-0 ${
                              pendingAttachments.length > 0 ? 'text-[#1a4d2e]' : 'text-stone-400 hover:text-stone-600'
                            }`}
                            title="إرفاق"
                          >
                            <Paperclip className="h-5 w-5" />
                          </button>

                          {/* Image Upload Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeBusiness?.premiumMessagingEnabled) {
                                fileInputRef.current?.click();
                              } else {
                                alert("⚠️ ميزة إرسال مرفقات الصور معطلة لهذا المحل. يجب ترقية خدمة الرسائل للاستفادة من هذه الميزة.");
                              }
                            }}
                            className={`p-1.5 transition-colors shrink-0 ${
                              activeBusiness?.premiumMessagingEnabled
                                ? 'text-stone-400 hover:text-stone-600 cursor-pointer'
                                : 'text-stone-300 cursor-not-allowed'
                            }`}
                            title={activeBusiness?.premiumMessagingEnabled ? "إرفاق صورة" : "الوسائط معطلة"}
                          >
                            <ImageIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Send CTA */}
                      <button
                        type="submit"
                        disabled={!inputText.trim() && !selectedFile && pendingAttachments.length === 0}
                        className="p-3 bg-[#1a4d2e] text-white hover:bg-[#133b22] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
                      >
                        <Send className="h-5 w-5 rtl:-scale-x-100" />
                      </button>
                    </div>
                  </form>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-stone-50/20">
              <MessageSquare className="h-16 w-16 text-stone-200 mb-4" />
              <h2 className="text-lg font-black text-stone-700 mb-1">اختر محادثة لبدء الدردشة</h2>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                انقر على إحدى جهات الاتصال النشطة في القائمة اليمنى للبدء بمتابعة محادثاتك أو الرد على الزبائن.
              </p>
            </div>
          )}
        </div>

      </div>

      {imageToCrop && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={imageToCrop}
          initialAspectRatio="free"
          fileName={selectedFileName || 'chat-attachment.jpg'}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Custom Message Deletion Options Modal */}
      {deleteTargetMessage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-stone-200 shadow-xl overflow-hidden text-right transform scale-100 transition-all">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <h3 className="text-sm font-black text-stone-900">خيارات حذف الرسالة</h3>
              <button 
                onClick={() => setDeleteTargetMessage(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5">
              <p className="text-xs text-stone-600 leading-relaxed font-bold mb-4">
                يرجى اختيار طريقة حذف هذه الرسالة:
              </p>
              
              <div className="space-y-2.5">
                {/* Delete for Me Button */}
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteMessage('me')}
                  disabled={deletingType !== null}
                  className="w-full text-right p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-98 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-black text-stone-800">حذف لي فقط</span>
                    <span className="block text-[10px] text-stone-400 mt-0.5 leading-none">سيتم إخفاء هذه الرسالة من صندوق الرسائل الخاص بك فقط.</span>
                  </div>
                  {deletingType === 'me' ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-stone-600 shrink-0" />
                  ) : (
                    <User className="h-4.5 w-4.5 text-stone-400 group-hover:text-stone-600 shrink-0 transition-colors" />
                  )}
                </button>

                {/* Delete for Everyone Button */}
                {(deleteTargetMessage.senderId === currentUser?.uid || currentUser?.email === 'princessofx2344@gmail.com') ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmDeleteMessage('everyone')}
                    disabled={deletingType !== null}
                    className="w-full text-right p-3 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-98 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-red-700">حذف لدى الجميع</span>
                      <span className="block text-[10px] text-red-400 mt-0.5 leading-none">سيتم مسح هذه الرسالة نهائياً من الصندوق لدى جميع الأطراف.</span>
                    </div>
                    {deletingType === 'everyone' ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-red-600 shrink-0" />
                    ) : (
                      <Trash2 className="h-4.5 w-4.5 text-red-400 group-hover:text-red-600 shrink-0 transition-colors" />
                    )}
                  </button>
                ) : (
                  <div className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-bold leading-relaxed">
                    لا يمكنك اختيار "حذف لدى الجميع" لأنك لست مرسل هذه الرسالة.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetMessage(null)}
                className="px-4 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Mention Picker Modal */}
      {mentionModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden text-right flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <AtSign className="h-4.5 w-4.5 text-[#1a4d2e]" />
                <h3 className="text-sm font-black text-stone-900">إشارة وإرفاق في الرسالة</h3>
              </div>
              <button 
                type="button"
                onClick={() => setMentionModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer animate-none"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-stone-500 leading-relaxed font-bold">
                اختر ما ترغب بالإشارة إليه أو إرفاقه في المحادثة:
              </p>

              {/* 1. Direct Contacts Section */}
              {(activeBusiness?.phone || activeBusiness?.whatsapp || (activeBusiness as any)?.socialLinks?.whatsapp) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 border-b border-blue-100 pb-1.5">
                    <Phone className="h-4 w-4" />
                    <span>وسائل التواصل المباشر</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeBusiness?.phone && (
                      <button
                        type="button"
                        onClick={() => handleSelectMention(`[mention-contact:phone:${activeBusiness.phone}:${activeBusiness.name || activeRoom?.businessName}]`)}
                        className="text-right p-2.5 bg-blue-50/40 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-blue-950 truncate">رقم الهاتف: {activeBusiness.phone}</span>
                        <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                      </button>
                    )}
                    {(activeBusiness?.whatsapp || (activeBusiness as any)?.socialLinks?.whatsapp || activeBusiness?.phone) && (
                      <button
                        type="button"
                        onClick={() => handleSelectMention(`[mention-contact:whatsapp:${activeBusiness?.whatsapp || (activeBusiness as any)?.socialLinks?.whatsapp || activeBusiness?.phone}:${activeBusiness?.name || activeRoom?.businessName}]`)}
                        className="text-right p-2.5 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-emerald-950 truncate">واتساب: {activeBusiness?.whatsapp || (activeBusiness as any)?.socialLinks?.whatsapp || activeBusiness?.phone}</span>
                        <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Map Location Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-amber-700 flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>موقع المنشأة على الخريطة</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Boolean(activeBusiness?.latitude && activeBusiness?.longitude) && (
                    <button
                      type="button"
                      onClick={() => {
                        const lat = activeBusiness?.latitude || '';
                        const lng = activeBusiness?.longitude || '';
                        const bizId = activeBusiness?.id || activeRoom?.businessId || '';
                        const bizName = activeBusiness?.name || activeRoom?.businessName || '';
                        handleSelectMention(`[mention-map:interactive:${bizId}:${encodeURIComponent(bizName)}:${lat}:${lng}]`);
                      }}
                      className="text-right p-2.5 bg-amber-50/40 hover:bg-amber-50 border border-amber-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                    >
                      <span className="font-bold text-amber-950 truncate">الخريطة التفاعلية</span>
                      <Plus className="h-4 w-4 text-amber-600 shrink-0" />
                    </button>
                  )}
                  {(() => {
                    const rawPlaceUrl = activeBusiness?.googlePlaceUrl?.trim() || '';
                    const actionUrl = activeBusiness ? getGoogleMapsActionUrls(activeBusiness).viewUrl : '';
                    const googleUrl = rawPlaceUrl || actionUrl;
                    if (!googleUrl) return null;
                    const immediateEmbed = activeBusiness ? getGoogleMapsEmbedUrl(activeBusiness) : '';
                    const coordsEmbed = (activeBusiness?.latitude && activeBusiness?.longitude) 
                      ? `https://maps.google.com/maps?q=${activeBusiness.latitude},${activeBusiness.longitude}&hl=ar&z=16&output=embed` 
                      : '';
                    const embedUrl = immediateEmbed || coordsEmbed || '';
                    const bizName = activeBusiness?.name || activeRoom?.businessName || '';
                    return (
                      <button
                        type="button"
                        onClick={() => handleSelectMention(`[mention-map:google:${encodeURIComponent(googleUrl)}:${encodeURIComponent(bizName)}:${encodeURIComponent(embedUrl)}]`)}
                        className="text-right p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-stone-900 truncate">خرائط Google</span>
                        <Plus className="h-4 w-4 text-stone-600 shrink-0" />
                      </button>
                    );
                  })()}
                </div>
                {!Boolean(activeBusiness?.latitude && activeBusiness?.longitude) && !Boolean(activeBusiness && getGoogleMapsActionUrls(activeBusiness).viewUrl) && (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لم يتم تحديد موقع جغرافي للمنشأة على الخريطة بعد.</p>
                )}
              </div>

              {/* 3. Business Card Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-[#1a4d2e] flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                  <Store className="h-4 w-4" />
                  <span>بطاقة صفحة المنشأة على الموقع</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const bizId = activeRoom?.businessId || '';
                    const bizName = activeBusiness?.name || activeRoom?.businessName || '';
                    const logo = activeBusiness?.logoUrl || (activeBusiness as any)?.profileImage || '';
                    const cat = activeBusiness?.category || '';
                    const district = activeBusiness?.district || activeBusiness?.address || '';
                    const rating = activeBusiness?.rating || 0;
                    handleSelectMention(`[mention-business:${bizId}:${encodeURIComponent(bizName)}:${encodeURIComponent(logo)}:${encodeURIComponent(cat)}:${encodeURIComponent(district)}:${rating}]`);
                  }}
                  className="w-full text-right p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                >
                  <span className="font-bold text-emerald-950">بطاقة المنشأة: {activeBusiness?.name || activeRoom?.businessName}</span>
                  <Plus className="h-4 w-4 text-emerald-600" />
                </button>
              </div>

              {/* 4. Products & Services Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-amber-700 flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span>المنتجات أو الخدمات</span>
                </h4>
                
                {activeBusiness?.menuItems && activeBusiness.menuItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeBusiness.menuItems.slice(0, 10).map((item: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const name = item.name || '';
                          const price = item.price || '';
                          const img = item.imageUrl || item.image || '';
                          const cat = item.category || 'عام';
                          const desc = item.description || '';
                          handleSelectMention(`[mention-product:${encodeURIComponent(name)}:${encodeURIComponent(price)}:${encodeURIComponent(img)}:${encodeURIComponent(cat)}:${encodeURIComponent(desc)}]`);
                        }}
                        className="text-right p-2.5 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-200 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <div className="min-w-0 flex-1 ml-2">
                          <span className="block font-black text-stone-800 truncate">{item.name}</span>
                          <span className="block text-[10px] text-stone-500 mt-0.5">{item.price} د.أ</span>
                        </div>
                        <Plus className="h-4 w-4 text-amber-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : activeBusiness?.medicalProfile?.procedures && activeBusiness.medicalProfile.procedures.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeBusiness.medicalProfile.procedures.slice(0, 10).map((proc: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const name = proc.name || proc || '';
                          const price = proc.price || 'متاح';
                          const img = proc.imageUrl || '';
                          const cat = 'إجراء طبي';
                          const desc = proc.description || '';
                          handleSelectMention(`[mention-product:${encodeURIComponent(name)}:${encodeURIComponent(price)}:${encodeURIComponent(img)}:${encodeURIComponent(cat)}:${encodeURIComponent(desc)}]`);
                        }}
                        className="text-right p-2.5 bg-stone-50 hover:bg-emerald-50/50 border border-stone-200 hover:border-emerald-200 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <div className="min-w-0 flex-1 ml-2">
                          <span className="block font-black text-stone-800 truncate">{proc.name || proc}</span>
                        </div>
                        <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا توجد منتجات أو خدمات مدرجة حالياً.</p>
                )}
              </div>

              {/* 5. Offers Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-purple-700 flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Tag className="h-4 w-4" />
                  <span>عروض وتخفيضات المنشأة</span>
                </h4>
                
                {loadingMentionData ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  </div>
                ) : mentionOffers.length > 0 ? (
                  <div className="space-y-1.5">
                    {mentionOffers.map((offer: any) => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => {
                          const id = offer.id || '';
                          const title = offer.title || '';
                          const discount = offer.discountPercentage || '';
                          const img = offer.image || '';
                          const cat = offer.category || '';
                          const exp = offer.expiresIn || '';
                          const desc = offer.description || '';
                          handleSelectMention(`[mention-offer:${id}:${encodeURIComponent(title)}:${encodeURIComponent(discount)}:${encodeURIComponent(img)}:${encodeURIComponent(cat)}:${encodeURIComponent(exp)}:${encodeURIComponent(desc)}]`);
                        }}
                        className="w-full text-right p-2.5 bg-purple-50/40 hover:bg-purple-50 border border-purple-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-purple-950 truncate max-w-[90%]">{offer.title}</span>
                        <Plus className="h-4 w-4 text-purple-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا توجد عروض منشورة لهذه المنشأة حالياً.</p>
                )}
              </div>

              {/* 6. Jobs Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 border-b border-blue-100 pb-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span>الوظائف الشاغرة لدى المنشأة</span>
                </h4>
                
                {loadingMentionData ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : mentionJobs.length > 0 ? (
                  <div className="space-y-1.5">
                    {mentionJobs.map((job: any) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          const id = job.id || '';
                          const title = job.title || '';
                          const comp = job.company || activeBusiness?.name || activeRoom?.businessName || '';
                          const cat = job.category || '';
                          const type = job.jobType || '';
                          const loc = job.location || activeBusiness?.district || 'إربد';
                          const desc = job.description || '';
                          handleSelectMention(`[mention-job:${id}:${encodeURIComponent(title)}:${encodeURIComponent(comp)}:${encodeURIComponent(cat)}:${encodeURIComponent(type)}:${encodeURIComponent(loc)}:${encodeURIComponent(desc)}]`);
                        }}
                        className="w-full text-right p-2.5 bg-blue-50/40 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-blue-950 truncate max-w-[90%]">{job.title}</span>
                        <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 bg-stone-50 p-2.5 rounded-lg text-center font-bold">لا توجد وظائف شاغرة معلنة لهذه المنشأة حالياً.</p>
                )}
              </div>

              {/* 7. Review Invite Section (Only for business / facility owner) */}
              {(ownedBusinesses.some(b => b.id === activeRoom?.businessId) || activeRoom?.businessOwnerId === currentUser?.uid) && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-black text-amber-600 flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                    <Star className="h-4 w-4" />
                    <span>دعوة لتقييم المحل</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const bizId = activeBusiness?.id || activeRoom?.businessId || '';
                      const bizName = activeBusiness?.name || activeRoom?.businessName || '';
                      handleSelectMention(`[mention-review-invite:${bizId}:${encodeURIComponent(bizName)}]`);
                    }}
                    className="w-full text-right p-3 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 rounded-xl transition-all flex items-center justify-between cursor-pointer text-xs"
                  >
                    <span className="font-bold text-amber-950">إرفاق بوكس دعوة تقييم المحل للزبون</span>
                    <Plus className="h-4 w-4 text-amber-700 shrink-0" />
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-4 py-3.5 bg-stone-50 border-t border-stone-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMentionModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && activeBusiness && (
        <VipUpgradeRequestModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          business={activeBusiness}
        />
      )}

    </div>
  );
}
