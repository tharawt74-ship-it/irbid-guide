export interface MenuItem {
  id: string;
  name: string;
  price: string;
  originalPrice?: string; // Original price before discount
  description?: string;
  category?: string;
  imageUrl?: string;
  isPopular?: boolean;
  isAvailable?: boolean;
  badge?: 'popular' | 'new' | 'spicy' | 'vegetarian' | 'none'; // World-class badge tags
  options?: string[]; // Customized choices or add-ons (e.g., extra cheese, spicy sauce)
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
  snapchat?: string;
  telegram?: string;
  whatsapp?: string;
}

export interface WorkingHours {
  isOpen24Hours?: boolean;
  openTime?: string; // e.g. "09:00"
  closeTime?: string; // e.g. "23:00"
  days?: string; // e.g. "طوال أيام الأسبوع"
  isCustomClosed?: boolean;
  isRamadanMode?: boolean;
  ramadanOpenTime?: string;
  ramadanCloseTime?: string;
  exceptionalNote?: string;
}

export interface BusinessAnalytics {
  views: number;
  whatsappClicks: number;
  callClicks: number;
  directionClicks: number;
  menuViews: number;
  shareClicks: number;
  lastUpdated?: number;
  peakHours?: string;
  weeklyDistribution?: { day: string; views: number; calls: number }[];
}

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  district?: string;
  phone?: string;
  imageUrl?: string;
  logoUrl?: string;
  rating: number;
  reviewCount: number;
  createdAt: number;
  userId?: string;
  ownerName?: string;
  username?: string; // e.g. "alkhiyam_cafe" or "irbid_burger" for custom social media profile URL
  isHidden?: boolean; // Hide / unpublish business page from public directory
  status?: 'active' | 'hidden' | 'pending' | 'rejected';
  googlePlaceUrl?: string;
  hideSiteReviews?: boolean;
  hideGoogleReviews?: boolean;
  isFeatured?: boolean;
  views?: number;
  
  // Package & Verification
  packagePlan?: 'basic' | 'golden' | 'vip' | 'pay_per_use';
  isVerified?: boolean;
  vipSubscriptionStartsAt?: number; // timestamp in ms
  vipSubscriptionExpiresAt?: number; // timestamp in ms
  isVipScheduled?: boolean;
  vipNotes?: string;

  // Premium Messaging Add-on
  premiumMessagingEnabled?: boolean;
  premiumMessagingPlan?: 'none' | '1_month' | '3_months' | '6_months' | '1_year';
  premiumMessagingExpiresAt?: number;

  // Live Working Hours (For all packages)
  workingHours?: WorkingHours;

  // Social Links
  socialLinks?: SocialLinks;

  // VIP Analytics
  analytics?: BusinessAnalytics;

  // VIP Digital Menu / Catalog
  menuItems?: MenuItem[];
  menuCategories?: string[];
  reels?: VipReel[];
  gallery?: (string | VipGalleryItem)[];
}

export interface VipGalleryItem {
  url: string;
  caption?: string;
  createdAt: number;
}

export interface VipReel {
  id: string;
  url: string;
  title?: string;
  createdAt: number;
}

export interface ReviewReply {
  text: string;
  createdAt: number;
  authorName: string;
  authorUid?: string;
}

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userEmail?: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
  reply?: ReviewReply;
}

export type UserRole = 'super_admin' | 'supervisor' | 'merchant' | 'user' | 'guest';

export interface SupervisorPermissions {
  canApproveShops: boolean;
  canModerateJobs: boolean;
  canModerateReviews: boolean;
  canManageBanners: boolean;
  canBroadcast?: boolean;
}

export interface SupervisorAccount {
  uid: string;
  email: string;
  displayName: string;
  role: 'supervisor' | 'super_admin';
  assignedCategories?: string[];
  permissions: SupervisorPermissions;
  createdAt: number;
  lastActive?: number;
  addedBy?: string;
  notes?: string;
}

export interface UserPreferences {
  notifyOffers?: boolean;
  notifyJobs?: boolean;
  notifyMessages?: boolean;
  hidePublicActivity?: boolean;
  allowDirectMessages?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  district?: string;
  bio?: string;
  preferences?: UserPreferences;
  status?: 'active' | 'suspended' | 'pending';
  statusReason?: string;
  savedFavorites?: string[];
  createdAt?: number;
  lastLoginAt?: number;
  isMerchant?: boolean;
  merchantBusinessIds?: string[];
  supervisorPermissions?: SupervisorPermissions;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  location: string;
  imageUrl: string;
  isHot?: boolean;
  source: string;
  createdAt?: number;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  businessId?: string;
  category: string;
  jobType: 'دوام كامل' | 'دوام جزئي' | 'مناسب للطلاب' | 'عن بعد' | string;
  location: string;
  salary?: string;
  workHours?: string;
  experienceLevel?: string;
  genderPreference?: 'all' | 'males' | 'females' | string;
  benefits?: string[];
  description: string;
  requirements?: string[];
  contactPhone: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  howToApply?: string;
  isUrgent?: boolean;
  status?: 'active' | 'closed';
  createdAt: number;
  userId?: string;
  views?: number;
}

export interface JobOpening {
  id: string;
  title: string;
  companyName: string;
  location: string;
  type: 'دوام كامل' | 'دوام جزئي' | 'تدريب / طلاب' | 'عن بعد';
  salary?: string;
  category: string;
  description: string;
  requirements: string[];
  contactPhone: string;
  contactEmail?: string;
  postedAt: string;
  isUrgent?: boolean;
}

export interface MarketingRequest {
  id?: string;
  businessId: string;
  businessName: string;
  userId: string;
  userEmail?: string;
  serviceType: string;
  serviceName: string;
  status: 'pending' | 'contacted' | 'completed' | 'approved' | 'rejected';
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledNotes?: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'offer' | 'job' | 'marketing' | 'system' | 'business' | 'news';
  link?: string;
  isRead?: boolean;
  createdAt: number;
  userId?: string; // 'all' or specific user UID
  badge?: string;
  targetArea?: string; // e.g. 'all' | 'شارع الجامعة' | 'شارع الثقافة' | 'إربد الوسط'
  targetCategory?: string; // Main category
  targetSubCategory?: string; // Sub category
}

export interface OwnershipClaim {
  id: string;
  businessId: string;
  businessName: string;
  applicantUid: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  documentUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface BannerAd {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  badgeText?: string;
  businessName?: string;
  contactPhone?: string;
  status: 'active' | 'inactive';
  createdAt: number;
}

export interface BannerBookingRequest {
  id: string;
  advertiserName: string;
  businessName: string;
  contactPhone: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  durationDays: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'customer' | 'business';
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  createdAt: number;
  expiresAt: number;
}

export interface ChatRoom {
  id: string; // businessId_userId
  businessId: string;
  businessName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  lastMessageText: string;
  lastMessageTime: number;
  unreadByBusiness: boolean;
  unreadByUser: boolean;
  businessOwnerId?: string;
}

export interface PromoDeal {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  discountPercentage?: number;
  dealCode?: string;
  imageUrl?: string;
  expiresAt: number;
  createdAt: number;
}

export interface EditSuggestion {
  id: string;
  businessId: string;
  businessName: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  suggestedChanges: {
    phone?: string;
    address?: string;
    workingHours?: string;
    googlePlaceUrl?: string;
    notes?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  businessId: string;
  businessName: string;
  reviewComment: string;
  reviewAuthorName: string;
  reason: string;
  reportedByUid: string;
  reportedByEmail?: string;
  status: 'pending' | 'resolved_dismissed' | 'resolved_deleted';
  createdAt: number;
}


