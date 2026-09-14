export interface MenuItemVersion {
  id: string;
  name: string; // e.g., "حجم صغير", "حجم كبير", "وجبة كومبو", "دبل لحمة"
  priceType: 'fixed' | 'additional' | 'free'; // 'fixed' = سعر محدد للنسخة, 'additional' = زيادة إضافية على السعر, 'free' = مجانية بدون تكلفة
  price?: string | number; // e.g., "3.50" or "0.75"
  description?: string; // Optional subtitle or details (e.g. "تكفي شخصين", "مع بطاطا ومشروب")
}

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
  options?: string[]; // Customized choices or add-ons (backward compatible)
  versions?: MenuItemVersion[]; // New: Multiple versions / sizes / add-on tiers with custom pricing
  versionType?: 'sizes' | 'addons'; // 'sizes' = أحجام (يبدأ من أقل حجم ويتجاهل سعر التاب الأساسي)، 'addons' = إضافات (يظهر السعر الأصلي بدون يبدأ من)
  createdAt?: number; // Creation timestamp in milliseconds
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
  selectedDays?: string[]; // e.g. ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
  isCustomClosed?: boolean;
  vacationReason?: string; // e.g. "إجازة عيد الأضحى المبارك" أو "أعمال صيانة وتجديد"
  isRamadanMode?: boolean;
  ramadanOpenTime?: string;
  ramadanCloseTime?: string;
  exceptionalNote?: string;
}

export interface HousingItem {
  id: string;
  title: string;
  type: 'سكن طالبات' | 'سكن طلاب' | 'شقق عائلية' | 'أستوديو مفروش' | 'شقة طالبات' | 'سكن شباب' | 'غرفة مفردة' | string;
  university: 'اليرموك' | 'العلوم والتكنولوجيا' | 'أخرى / وسط المدينة' | string;
  price: number;
  pricePeriod: 'شهري' | 'سنوي' | 'فصلي' | string;
  location: string;
  district?: string;
  distanceToCampus: string;
  roomsCount: string;
  services: string[];
  description: string;
  contactPhone: string;
  contactWhatsapp?: string;
  phone?: string;
  whatsapp?: string;
  ownerName: string;
  image: string;
  images?: string[];
  isVerified?: boolean;
  isFeatured?: boolean;
  extraWeeks?: number;
  featuredDays?: number;
  durationDays?: number;
  totalFee?: number;
  totalCost?: number;
  status?: 'pending' | 'approved' | 'rejected';
  paymentStatus?: 'free' | 'pending' | 'paid' | 'pending_approval';
  rejectionReason?: string;
  userId?: string;
  userEmail?: string;
  createdAt?: number;
  expiryDate?: number;
  featuredExpiryDate?: number;
  approvedAt?: number;
  isOccupied?: boolean;
  isAvailable?: boolean;
  viewsCount?: number;
  whatsappClicks?: number;
  phoneClicks?: number;
  isVip?: boolean;
  gender?: string;
  contactMode?: 'both' | 'phone_only' | 'whatsapp_only';
  isFurnished?: string;
  buildYear?: string;
}

export interface DayStatsRecord {
  view?: number;
  call?: number;
  direction?: number;
  menu?: number;
  share?: number;
  views?: number;
  whatsapp?: number;
  calls?: number;
  directions?: number;
  menus?: number;
  shares?: number;
  interactions?: number;
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
  dayOfWeekStats?: {
    sat?: DayStatsRecord;
    sun?: DayStatsRecord;
    mon?: DayStatsRecord;
    tue?: DayStatsRecord;
    wed?: DayStatsRecord;
    thu?: DayStatsRecord;
    fri?: DayStatsRecord;
  };
  dailyStats?: Record<string, DayStatsRecord>;
  weeklyDistribution?: { day: string; views: number; calls: number }[];
}

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  address: string;
  district?: string;
  phone?: string;
  imageUrl?: string;
  logoUrl?: string;
  rating: number;
  reviewCount: number;
  createdAt: number;
  userId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  username?: string; // e.g. "alkhiyam_cafe" or "irbid_burger" for custom social media profile URL
  isHidden?: boolean; // Hide / unpublish business page from public directory
  status?: 'active' | 'hidden' | 'pending' | 'rejected' | 'approved';
  requestId?: string;
  googlePlaceUrl?: string;
  hideSiteReviews?: boolean;
  isFeatured?: boolean;
  featuredStartDate?: number;
  featuredExpiryDate?: number;
  views?: number;
  
  // Map and VIP details
  isVip?: boolean;
  packageId?: string;
  latitude?: string;
  longitude?: string;
  coverImage?: string;
  image?: string;
  region?: string;
  
  // Package & Verification
  packagePlan?: 'basic' | 'golden' | 'vip' | 'pay_per_use';
  billingPeriod?: 'monthly' | 'yearly';
  isVerified?: boolean;
  isVipTrial?: boolean;
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

  // Multi-Branching Properties
  parentBusinessId?: string;
  isBranch?: boolean;

  // Social Links
  socialLinks?: SocialLinks;

  // VIP Analytics
  analytics?: BusinessAnalytics;

  // VIP Digital Menu / Catalog
  menuItems?: MenuItem[];
  menuCategories?: string[];
  menuTitle?: string;
  menuDescription?: string;
  reels?: VipReel[];
  gallery?: (string | VipGalleryItem)[];
  staffEmails?: string[];

  // VIP Interactive Visitor Welcome Popup
  vipPopup?: VipPopupConfig;

  // About Section Media (Available to all businesses: Video or Image)
  aboutMedia?: AboutMediaConfig;
  aboutVideoUrl?: string;
  aboutImageUrl?: string;

  // Medical Facility Profile (Specialized for clinics, hospitals, labs, pharmacies)
  medicalProfile?: MedicalFacilityInfo;
  facilityType?: string;
  whatsapp?: string;
  requestType?: string;
  phoneClicks?: number;
  directionsClicks?: number;
}

export interface MedicalInsurance {
  name: string;
  type?: 'نقابة' | 'شركة تأمين' | 'حكومي' | 'خاص' | string;
  coverageDetails?: string; // e.g., "تغطية كاملة للكشفية", "خصم 20%"
  logoUrl?: string;
  isDirectBilling?: boolean;
}

export interface MedicalDoctor {
  name: string;
  title: string; // e.g. "استشاري أول جراحة القلب والقسطرة"
  degrees: string[]; // e.g. ["البورد الأردني", "زميل الكلية الملكية البريطانية FRCS", "استشاري سابق بمستشفى الملك المؤسس"]
  subspecialty?: string;
  experienceYears?: number;
  licenseNumber?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  category?: string; // e.g. "فحوصات تشخيصية", "إجراءات علاجية", "عمليات اليوم الواحد"
  description?: string;
  duration?: string; // e.g. "30 دقيقة", "جلسة واحدة"
  price?: string | number; // e.g. "25 دينار" or "حسب تعرفة النقابة"
  insuranceCovered?: boolean;
  preparationNotes?: string; // e.g. "يشترط الصيام 8 ساعات"
  isPopular?: boolean;
}

export interface MedicalEquipment {
  name: string;
  description?: string;
  brandOrOrigin?: string; // e.g. "ألماني Candela GentleLase Pro"
  imageUrl?: string;
}

export interface MedicalFacilityInfo {
  // نبذة عن المنشأة
  aboutFacility?: string;

  // 1. شركات التأمين الصحي المعتمدة
  insurances?: (string | MedicalInsurance)[];
  acceptsInsuranceDirectBilling?: boolean;
  insuranceNotes?: string;

  // 2. المؤهلات والدرجة العلمية والترخيص
  doctorProfile?: MedicalDoctor;
  doctorsList?: MedicalDoctor[];
  showMedicalStaff?: boolean;
  licenseNumber?: string;
  accreditationBody?: string; // e.g. "مرخص ومعتمد من وزارة الصحة ونقابة الأطباء الأردنية"

  // 3. نظام الكشف والمواعيد
  consultationFee?: string; // e.g. "15 - 20 دينار (أو تعرفة النقابة)"
  followUpPolicy?: string; // e.g. "المراجعة مجانية خلال 14 يوماً من تاريخ الكشف"
  appointmentDurationMinutes?: number;
  appointmentTypes?: ('in_clinic' | 'telemedicine' | 'urgent' | 'home_visit')[];
  bookingNotice?: string;

  // 4. الإجراءات والخدمات الطبية
  procedures?: MedicalProcedure[];

  // 5. طوارئ 24 ساعة والتواصل العاجل
  has24Emergency?: boolean;
  emergencyPhone?: string;
  onCallService?: boolean;
  offersHomeVisits?: boolean;
  homeVisitPhone?: string;

  // 6. الأجهزة والتقنيات الطبية المستخدمة
  showEquipments?: boolean;
  equipments?: MedicalEquipment[];

  // 7. تسهيلات الوصول للمرضى وكبار السن
  showAmenities?: boolean;
  hasWheelchairAccess?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasFemaleStaff?: boolean;
  hasKidsArea?: boolean;
  hasElectronicPayment?: boolean;
  paymentMethods?: string[]; // e.g. ["نقد", "فيزا / ماستركارد", "كليك CliQ", "أقساط بنكية"]

  // 8. معايير التقييمات الطبية الموثوقة
  medicalRatingMetrics?: {
    waitingTimeScore?: number; // e.g. 4.8
    doctorListeningScore?: number; // e.g. 4.9
    cleanlinessScore?: number; // e.g. 5.0
    staffFriendlinessScore?: number; // e.g. 4.7
  };
}

export interface VipPopupConfig {
  enabled: boolean;
  type: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  dismissible?: boolean;
}

export interface AboutMediaConfig {
  type: 'image' | 'video';
  url: string;
  caption?: string;
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
  emailVerified?: boolean;
  customEmailVerified?: boolean;
  verificationCode?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  summary?: string;
  content?: string;
  category: string;
  date: string;
  readTime: string;
  location: string;
  imageUrl: string;
  image?: string;
  isHot?: boolean;
  source: string;
  videoUrl?: string;
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
  status?: 'active' | 'closed' | 'pending';
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
  businessLogoUrl?: string;
  userId: string;
  userEmail?: string;
  serviceType: string;
  serviceName: string;
  status: 'pending' | 'contacted' | 'completed' | 'approved' | 'rejected';
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledNotes?: string;
  createdAt: number;
  // Custom fields added for forms
  contactWhatsapp?: string;
  durationWeeks?: string;
  publishTimeOption?: 'immediately' | 'scheduled';
  publishStartDate?: string;
  targetKeywords?: string;
  notes?: string;
  notificationTitle?: string;
  notificationBody?: string;
  targetLink?: string;
  quantity?: string;
  address?: string;
  logoInstructions?: string;
  campaignGoal?: string;
  preferredFilmingDate?: string;
  highlightPoints?: string;
  // Homepage Banner Ad custom fields
  pageTarget?: string;
  targetEntityId?: string;
  bannerType?: 'business' | 'image_only' | 'animated_image' | 'text_and_button';
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerImageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  badgeText?: string;
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
  businessId?: string;
  businessName?: string;
  businessLogoUrl?: string;
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
  isEdited?: boolean;
  editedAt?: number;
  deletedForUsers?: string[];
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

export interface CategoryConfig {
  id: string;
  name: string;
  iconName: string;
  description?: string;
  badgeColor?: string;
  subcategories: string[];
  active?: boolean;
  order?: number;
}

export interface VipPlanConfig {
  id: string;
  name: string;
  badge: string;
  price: number;
  yearlyPrice?: number;
  period: string;
  badgeColor: string;
  features: string[];
  popular?: boolean;
  active?: boolean;
  internalNote?: string;
}

export interface GlobalSiteSettings {
  siteName: string;
  siteSubtitle: string;
  logoUrl: string;
  useFullLogo?: boolean;
  logoHeight?: number;
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  footerDescription: string;
  enableAiAssistant?: boolean;
}

export interface EmergencyNumber {
  id: string;
  title: string;
  number: string;
  icon?: string;
}

export interface StaticPagesConfig {
  aboutUsText: string;
  termsText: string;
  privacyText: string;
  emergencyNumbers: EmergencyNumber[];
}

export interface SeasonalCampaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  discountText: string;
  bannerUrl: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}




export interface StoryConfig {
  id: string;
  title: string;
  imageUrl: string;
  link?: string;
  active: boolean;
}

export interface HomepageBanner {
  id: string;
  type: 'business' | 'image_only' | 'animated_image' | 'text_and_button';
  title: string;
  subtitle?: string;
  imageUrl: string;
  // For 'business' type:
  businessId?: string;
  businessName?: string;
  businessUsername?: string;
  category?: string; // Optional category badge
  rating?: number;
  reviewCount?: number;
  address?: string;
  // For 'text_and_button' type:
  buttonText?: string;
  buttonLink?: string;
  badgeText?: string;
  // Status:
  active?: boolean;
  createdAt?: number;
  bannerStartDate?: number;
  bannerExpiryDate?: number;
  pageTarget?: 'all' | 'home' | 'offers' | 'jobs' | 'housing' | 'transportation' | 'news' | 'tourism' | string;
}



export interface UpgradeRequest {
  id?: string;
  businessId: string;
  businessName: string;
  ownerId: string;
  ownerEmail?: string;
  ownerPhone?: string;
  planId: string;
  cycle: 'monthly' | 'yearly';
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
