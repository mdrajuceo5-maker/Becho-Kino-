export type AdCondition = 'used' | 'new';

export type AdCategory = 
  | 'all'
  | 'mobile'
  | 'electronics'
  | 'computer'
  | 'bike'
  | 'fashion'
  | 'property'
  | 'home';

export interface AdFeaturedSpecs {
  brand?: string;
  model?: string;
  driven?: string;
  engine?: string;
  registration?: string;
  year?: string;
  condition?: string;
  location?: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string; // e.g., 'দৈনিক (১ দিন)', '৩ দিন', '১ সপ্তাহ (৭ দিন)'
  days: number;
  price: number; // in BDT
  category?: string; // 'all' or category name
  isPopular?: boolean;
  features: string[];
}

export interface PaymentTransaction {
  id: string;
  adId: string;
  adTitle: string;
  userId?: string;
  userName: string;
  userPhone: string;
  packageId: string;
  packageName: string;
  packageDays: number;
  amount: number;
  paymentMethod: 'bkash' | 'nagad';
  senderNumber: string;
  trxId: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface PendingPayment {
  id?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  gateway: 'bkash' | 'nagad' | string;
  amount: number;
  transactionId: string;
  adId?: string;
  adTitle?: string;
  packageId?: string;
  packageName?: string;
  packageDays?: number;
  status: 'pending' | 'verified' | 'rejected' | string;
  createdAt?: any;
}

export interface Ad {
  id: string;
  slug: string;
  title: string;
  condition: AdCondition;
  category: string;
  categoryKey: string;
  model?: string;
  division: string;
  district: string;
  upazila: string;
  description: string;
  price: number;
  isNegotiable?: boolean;
  phone: string;
  deletePin?: string;
  images: string[];
  featured?: boolean;
  featuredSpecs?: AdFeaturedSpecs;
  userId?: string;
  sellerName: string;
  sellerPhone: string;
  sellerWhatsApp?: string;
  postedAt: string;
  views: number;
  status: 'active' | 'pending' | 'rejected' | 'sold';
  packageId?: string;
  packageName?: string;
  packageDays?: number;
  packageExpiryDate?: string;
  paymentStatus?: 'pending' | 'verified' | 'rejected' | 'free';
  paymentTrxId?: string;
  paymentMethod?: 'bkash' | 'nagad';
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  role?: 'user' | 'admin';
  status?: 'active' | 'pending' | 'scheduled_for_deletion' | 'suspended' | 'banned';
  passwordHash?: string;
  deletionScheduledAt?: string;
  suspendedUntil?: string;
  createdAt?: string;
}

export interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logoUrl: string | null;
  logoType: 'custom_image' | 'svg_brand';
  bannerSubtitle: string;
  seoDescription: string;
  announcementText: string;
  enableLiveChat: boolean;
  adminPin: string;
  requireUserApproval?: boolean;
  bkashNumber?: string;
  nagadNumber?: string;
  bkashLogoUrl?: string | null;
  nagadLogoUrl?: string | null;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  telegramUrl?: string;
  whatsappNumber?: string;
  packages?: SubscriptionPackage[];
  categoryPromoPricing?: Record<string, { top7: number; top30: number; boostMonth: number }>;
  adsensePublisherId?: string;
  adsenseEnabled?: boolean;
  adsenseAutoAds?: boolean;
}

export interface AdSenseConfig {
  publisherId: string;
  isEnabled?: boolean;
  autoAds?: boolean;
  updatedAt?: any;
}

export interface ReportRecord {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  adId?: string;
  adTitle?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  actionTaken?: string;
  createdAt: string;
}

export interface ChatThread {
  id: string; // `${adId}_${buyerId}_${sellerId}`
  adId: string;
  adTitle: string;
  adImage?: string;
  adPrice?: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage: string;
  lastMessageTime: string;
  lastSenderId: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  threadId?: string;
  adId: string;
  adTitle: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  receiverName?: string;
  isSeller: boolean;
  text: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  status?: 'sent' | 'delivered' | 'read';
  forwarded?: boolean;
  createdAt: any;
}


export interface DivisionLocation {
  name: string;
  districts: {
    name: string;
    upazilas: string[];
  }[];
}
