import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { Ad, PaymentTransaction, PendingPayment, ReportRecord, SiteSettings, SubscriptionPackage, UserProfile } from '../types';
import { 
  updateFirestoreSiteSettings, 
  deleteFirestoreAd, 
  subscribeToTransactions, 
  updatePaymentTransactionStatus,
  listenPendingPayments,
  updatePendingPaymentStatus,
  updateFirestoreAd,
  DEFAULT_PACKAGES,
  uploadMediaToFirebaseStorage,
  uploadLogoAndSave,
  uploadGatewayImage,
  subscribeToUsers,
  updateUserAccountStatus,
  deleteUserDoc,
  subscribeToReports,
  updateReportStatus,
  storage
} from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTakaPrice, toBengaliNumber } from './AdCard';
import { CATEGORIES_LIST, DEFAULT_CATEGORY_PROMO_PRICES } from '../data/bangladeshData';

interface AdminDashboardViewProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  totalAdsCount: number;
  ads: Ad[];
  onDeleteAd: (adId: string, pin: string) => Promise<boolean>;
  onExitAdmin: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  settings,
  onUpdateSettings,
  totalAdsCount,
  ads = [],
  onDeleteAd,
  onExitAdmin
}) => {
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');
  
  // Navigation Tabs in Admin Sidebar
  const [adminTab, setAdminTab] = useState<'dashboard' | 'pending' | 'users' | 'reports' | 'cancelled' | 'subscription' | 'logo' | 'ads' | 'config'>('dashboard');

  // Form State
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteTagline, setSiteTagline] = useState(settings.siteTagline);
  const [bannerSubtitle, setBannerSubtitle] = useState(settings.bannerSubtitle);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [customLogoUrl, setCustomLogoUrl] = useState(settings.logoUrl || '');
  const [announcementText, setAnnouncementText] = useState(settings.announcementText);
  const [seoDescription, setSeoDescription] = useState(settings.seoDescription);
  const [enableLiveChat, setEnableLiveChat] = useState(settings.enableLiveChat ?? true);
  const [bkashNumber, setBkashNumber] = useState(settings.bkashNumber || '01956629330');
  const [nagadNumber, setNagadNumber] = useState(settings.nagadNumber || '01956629330');
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || 'support@bechokino.com');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '01956629330');
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl || 'https://facebook.com/bechokino');
  const [telegramUrl, setTelegramUrl] = useState(settings.telegramUrl || 'https://t.me/bechokino');
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || '01956629330');
  const [bkashLogoUrl, setBkashLogoUrl] = useState<string>(settings.bkashLogoUrl || '');
  const [nagadLogoUrl, setNagadLogoUrl] = useState<string>(settings.nagadLogoUrl || '');
  const [isUploadingGateway, setIsUploadingGateway] = useState<'bkash' | 'nagad' | null>(null);
  const [newAdminPin, setNewAdminPin] = useState(settings.adminPin || 'admin123');
  const [requireUserApproval, setRequireUserApproval] = useState(settings.requireUserApproval ?? false);
  const [packages, setPackages] = useState<SubscriptionPackage[]>(settings.packages || DEFAULT_PACKAGES);
  const [categoryPricing, setCategoryPricing] = useState<Record<string, { top7: number; top30: number; boostMonth: number }>>(
    settings.categoryPromoPricing || DEFAULT_CATEGORY_PROMO_PRICES
  );

  // Transactions State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [pendingPayments, setPendingPayments] = useState<(PendingPayment & { id: string })[]>([]);
  const [cancelledSearchQuery, setCancelledSearchQuery] = useState('');
  const [adSearchQuery, setAdSearchQuery] = useState('');

  // Users State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended' | 'banned'>('all');
  const [customSuspendDays, setCustomSuspendDays] = useState<Record<string, number>>({});

  // Reports State
  const [reportsList, setReportsList] = useState<ReportRecord[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Rejection modal
  const [rejectionTarget, setRejectionTarget] = useState<{ adId: string; trxId?: string; pendingPaymentId?: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('ভুল বা জাল TrxID');

  // Ad Preview state
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  // Feedback UI
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Subscribe to real-time pending payments, transactions, users, and reports
  useEffect(() => {
    const unsubPendingPayments = listenPendingPayments((list) => {
      setPendingPayments(list);
    });
    const unsubTrx = subscribeToTransactions((trxs) => {
      setTransactions(trxs);
    });
    const unsubUsers = subscribeToUsers((users) => {
      setUsersList(users);
    });
    const unsubReports = subscribeToReports((reports) => {
      setReportsList(reports);
    });
    return () => {
      unsubPendingPayments();
      unsubTrx();
      unsubUsers();
      unsubReports();
    };
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Authenticate PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === (settings.adminPin || 'admin123') || adminPinInput.trim() === 'admin123') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('ভুল অ্যাডমিন পিন! অনুগ্রহ করে সঠিক পিন দিন।');
    }
  };

  // Real-Time Statistics
  const stats = useMemo(() => {
    const userSet = new Set<string>();
    ads.forEach(a => {
      if (a.userId) userSet.add(a.userId);
      else if (a.phone) userSet.add(a.phone);
    });
    transactions.forEach(t => {
      if (t.userId) userSet.add(t.userId);
      else if (t.userPhone) userSet.add(t.userPhone);
    });

    const totalUsers = Math.max(userSet.size, 1);
    const activeAdsCount = ads.filter(a => a.status === 'active' || !a.status).length;
    const pendingAdsCount = ads.filter(a => a.status === 'pending').length;
    const pendingTrxCount = transactions.filter(t => t.status === 'pending').length;
    const pendingPaymentsCount = pendingPayments.length;
    const verifiedTrxCount = transactions.filter(t => t.status === 'verified').length;
    const rejectedTrxCount = transactions.filter(t => t.status === 'rejected').length;
    const premiumAdsCount = ads.filter(a => a.paymentStatus === 'verified' || a.packageId).length;
    const totalRevenue = transactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalUsers,
      activeAdsCount,
      pendingAdsCount: Math.max(pendingAdsCount, pendingTrxCount, pendingPaymentsCount),
      premiumAdsCount,
      verifiedTrxCount,
      rejectedTrxCount,
      totalRevenue
    };
  }, [ads, transactions, pendingPayments]);

  // Pending Items List
  const pendingItems = useMemo(() => {
    const pendingAds = ads.filter(a => a.status === 'pending');
    return pendingAds.map(ad => {
      const matchingTrx = transactions.find(t => t.adId === ad.id);
      const matchingPendingPayment = pendingPayments.find(p => 
        p.adId === ad.id || 
        (p.transactionId && ad.paymentTrxId && p.transactionId.toUpperCase() === ad.paymentTrxId.toUpperCase())
      );
      return {
        ad,
        trx: matchingTrx,
        pendingPayment: matchingPendingPayment
      };
    });
  }, [ads, transactions, pendingPayments]);

  // Cancelled Items List
  const cancelledItems = useMemo(() => {
    const rejectedTrxs = transactions.filter(t => t.status === 'rejected');
    const query = cancelledSearchQuery.toLowerCase().trim();
    if (!query) return rejectedTrxs;
    return rejectedTrxs.filter(t => 
      t.trxId?.toLowerCase().includes(query) ||
      t.senderNumber?.toLowerCase().includes(query) ||
      t.userName?.toLowerCase().includes(query) ||
      t.userPhone?.toLowerCase().includes(query) ||
      t.adTitle?.toLowerCase().includes(query)
    );
  }, [transactions, cancelledSearchQuery]);

  // Filtered ads in moderation tab
  const filteredAdsList = useMemo(() => {
    const q = adSearchQuery.toLowerCase().trim();
    if (!q) return ads;
    return ads.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.sellerName?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q)
    );
  }, [ads, adSearchQuery]);

  // Approve / Publish Ad
  const handleApproveAd = async (adId: string, trxId?: string, pendingPaymentId?: string) => {
    setIsSaving(true);
    try {
      if (pendingPaymentId) {
        await updatePendingPaymentStatus(pendingPaymentId, 'verified', adId);
      }
      if (trxId) {
        await updatePaymentTransactionStatus(trxId, 'verified', adId);
      }
      await updateFirestoreAd(adId, {
        status: 'active',
        paymentStatus: 'verified'
      });
      showStatus('বিজ্ঞাপনটি যাচাই সম্পন্ন করে সফলভাবে লাইভ প্রকাশ করা হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showStatus('অনুমোদন করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reject / Cancel Ad
  const handleRejectAd = async () => {
    if (!rejectionTarget) return;
    setIsSaving(true);
    try {
      if (rejectionTarget.pendingPaymentId) {
        await updatePendingPaymentStatus(rejectionTarget.pendingPaymentId, 'rejected', rejectionTarget.adId);
      }
      if (rejectionTarget.trxId) {
        await updatePaymentTransactionStatus(rejectionTarget.trxId, 'rejected', rejectionTarget.adId);
      }
      await updateFirestoreAd(rejectionTarget.adId, {
        status: 'rejected',
        paymentStatus: 'rejected'
      });
      showStatus(`বিজ্ঞাপনটি (${rejectionReason}) কারণে বাতিল করা হয়েছে।`, 'success');
      setRejectionTarget(null);
      setRejectionReason('ভুল বা জাল TrxID');
    } catch (err) {
      console.error(err);
      showStatus('বাতিল করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logo Upload and Save directly to Firebase Storage and Firestore
  const handleLogoUploadAndSave = async (fileOverride?: File) => {
    const fileToUpload = fileOverride || selectedLogoFile;
    if (!fileToUpload && !customLogoUrl.trim() && !logoPreview) {
      showStatus('অনুগ্রহ করে একটি লোগো ফাইল নির্বাচন করুন অথবা ইমেজ URL লিংক দিন।', 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      let finalLogoUrl = customLogoUrl.trim();

      if (fileToUpload) {
        // Upload with resilient storage helper (instant resolution & error-proof)
        const uploadRes = await uploadLogoAndSave(fileToUpload);
        if (uploadRes.success && uploadRes.url) {
          finalLogoUrl = uploadRes.url;
        } else {
          throw new Error(uploadRes.error || 'লোগো আপলোড করা যায়নি');
        }
      }

      if (!finalLogoUrl && logoPreview) {
        finalLogoUrl = logoPreview;
      }

      const updatedSettings: SiteSettings = {
        ...settings,
        logoUrl: finalLogoUrl || null,
        logoType: finalLogoUrl ? 'custom_image' : 'svg_brand'
      };

      await updateFirestoreSiteSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      setLogoPreview(finalLogoUrl);
      setCustomLogoUrl(finalLogoUrl || '');
      setSelectedLogoFile(null);

      showStatus('লোগো সফলভাবে আপলোড ও ক্লাউড ফায়ারবেসে স্থায়ীভাবে সেভ হয়েছে!', 'success');
    } catch (err: any) {
      console.error('Logo upload/save error:', err);
      showStatus('লোগো আপলোড ও সংরক্ষণ ব্যর্থ হয়েছে: ' + (err.message || ''), 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Select Logo File with instant reliable reader preview
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showStatus('লোগো ফাইলের সাইজ ৮ মেগাবাইটের কম হতে হবে।', 'error');
        return;
      }
      setSelectedLogoFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoPreview(reader.result);
          setCustomLogoUrl('');
          showStatus('লোগো প্রিভিউ দেখা যাচ্ছে। স্থায়ী করতে "লোগো সেভ ও লাইভ আপডেট করুন" বাটনে চাপুন।', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save All Settings to Cloud Firestore
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        siteName: siteName.trim(),
        siteTagline: siteTagline.trim(),
        bannerSubtitle: bannerSubtitle.trim(),
        logoUrl: customLogoUrl.trim() || logoPreview || null,
        logoType: (customLogoUrl.trim() || logoPreview) ? 'custom_image' : 'svg_brand',
        announcementText: announcementText.trim(),
        seoDescription: seoDescription.trim(),
        enableLiveChat,
        bkashNumber: bkashNumber.trim(),
        nagadNumber: nagadNumber.trim(),
        bkashLogoUrl: bkashLogoUrl.trim() || null,
        nagadLogoUrl: nagadLogoUrl.trim() || null,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        facebookUrl: facebookUrl.trim(),
        telegramUrl: telegramUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
        adminPin: newAdminPin.trim() || 'admin123',
        requireUserApproval,
        packages,
        categoryPromoPricing: categoryPricing
      };

      await updateFirestoreSiteSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      showStatus('সকল সেটিংস ক্লাউড ফায়ারবেসে স্থায়ীভাবে সংরক্ষিত হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showStatus('সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default SVG Logo
  const handleResetToDefaultLogo = async () => {
    setLogoPreview(null);
    setCustomLogoUrl('');
    setSelectedLogoFile(null);
    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        logoUrl: null,
        logoType: 'svg_brand'
      };
      await updateFirestoreSiteSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      showStatus('ডিফল্ট BK ব্রান্ড লোগো সফলভাবে সেট ও সংরক্ষিত হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showStatus('ডিফল্ট লোগো রিসেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  // Upload Payment Gateway Logo (bKash / Nagad)
  const handleUploadGatewayFile = async (e: React.ChangeEvent<HTMLInputElement>, gateway: 'bkash' | 'nagad') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showStatus('গেটওয়ে লোগোর সাইজ ৮ মেগাবাইটের কম হতে হবে।', 'error');
      return;
    }

    setIsUploadingGateway(gateway);
    try {
      const result = await uploadGatewayImage(file, gateway);
      if (result.success && result.url) {
        if (gateway === 'bkash') {
          setBkashLogoUrl(result.url);
        } else {
          setNagadLogoUrl(result.url);
        }
        const updated: SiteSettings = {
          ...settings,
          bkashLogoUrl: gateway === 'bkash' ? result.url : (settings.bkashLogoUrl || null),
          nagadLogoUrl: gateway === 'nagad' ? result.url : (settings.nagadLogoUrl || null)
        };
        onUpdateSettings(updated);
        showStatus(`${gateway === 'bkash' ? 'bKash' : 'Nagad'} গেটওয়ে লোগো সফলভাবে আপলোড ও ক্লাউডে সেভ হয়েছে!`, 'success');
      } else {
        throw new Error(result.error || 'আপলোড ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      console.error('Gateway upload error:', err);
      showStatus(`গেটওয়ে লোগো আপলোড ব্যর্থ হয়েছে: ${err.message || ''}`, 'error');
    } finally {
      setIsUploadingGateway(null);
      e.target.value = '';
    }
  };

  // IF NOT AUTHENTICATED: Show Full-Page Dedicated PIN Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto mb-4 border border-orange-200 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-center text-[#0A1128] mb-1">
            অ্যাডমিন প্যানেল সিকিউরিটি
          </h2>
          <p className="text-xs text-center text-gray-500 mb-6">
            BechoKino.com অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করতে আপনার সিক্রেট পিন দিন।
          </p>

          {pinError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A1128] mb-1.5">
                অ্যাডমিন পিন (Admin PIN):
              </label>
              <input
                type="password"
                required
                autoFocus
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="PIN লিখুন (Default: admin123)"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-300 rounded-xl text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
              />
            </div>

            <button
              type="submit"
              id="btn-admin-login-submit"
              className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white font-black py-3 rounded-xl text-sm shadow-md shadow-orange-200 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>ড্যাশবোর্ডে প্রবেশ করুন</span>
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ওয়েবসাইটে ফিরে যান</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-400">
              ডিফল্ট মাস্টার পিন: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#FF6600] font-bold">admin123</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // DEDICATED FULL-PAGE SAAS ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1A202C] flex flex-col md:flex-row w-full max-w-[100vw] overflow-x-hidden">
      
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border animate-in slide-in-from-top-3 ${
          statusMessage.type === 'success' ? 'bg-[#0A1128] text-white border-emerald-500' : 'bg-red-600 text-white border-red-400'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. FIXED LEFT SIDEBAR */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0A1128] text-white flex flex-col shrink-0 border-r border-gray-800 shadow-xl z-20">
        
        {/* Sidebar Brand Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6600] flex items-center justify-center text-white font-black text-lg shadow-md">
              BK
            </div>
            <div>
              <h1 className="font-black text-sm text-white tracking-wide">BechoKino Control</h1>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                সিস্টেম লাইভ
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => setAdminTab('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'dashboard'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>ড্যাশবোর্ড ওভারভিউ</span>
            </div>
          </button>

          {/* 2. Pending Ads */}
          <button
            type="button"
            onClick={() => setAdminTab('pending')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'pending'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>পেন্ডিং বিজ্ঞাপন অনুমোদন</span>
            </div>
            {pendingItems.length > 0 && (
              <span className="bg-amber-400 text-[#0A1128] font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                {pendingItems.length}
              </span>
            )}
          </button>

          {/* 3. Cancelled Logs */}
          <button
            type="button"
            onClick={() => setAdminTab('cancelled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'cancelled'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>বাতিলকৃত ট্রানজেকশন লগ</span>
            </div>
            {cancelledItems.length > 0 && (
              <span className="bg-red-500/30 text-red-200 text-[10px] px-2 py-0.5 rounded-full">
                {cancelledItems.length}
              </span>
            )}
          </button>

          {/* 4. Subscriptions & Numbers */}
          <button
            type="button"
            onClick={() => setAdminTab('subscription')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'subscription'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>সাবস্ক্রিপশন ও মার্চেন্ট নম্বর</span>
            </div>
          </button>

          {/* 5. Logo & Branding */}
          <button
            type="button"
            onClick={() => setAdminTab('logo')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'logo'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>লোগো ও ব্র্যান্ডিং</span>
            </div>
          </button>

          {/* 6. Users Management */}
          <button
            type="button"
            onClick={() => setAdminTab('users')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'users'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>ইউজার ম্যানেজমেন্ট ও সার্চ</span>
            </div>
            <div className="flex items-center gap-1.5">
              {usersList.filter(u => u.status === 'pending').length > 0 && (
                <span className="bg-amber-400 text-[#0A1128] text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                  {usersList.filter(u => u.status === 'pending').length} পেন্ডিং
                </span>
              )}
              <span className="bg-cyan-500/20 text-cyan-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {usersList.length}
              </span>
            </div>
          </button>

          {/* 7. Reports & Complaints */}
          <button
            type="button"
            onClick={() => setAdminTab('reports')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'reports'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>অভিযোগ ও রিপোর্টস</span>
            </div>
            {reportsList.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-amber-400 text-[#0A1128] font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                {reportsList.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          {/* 8. All Ads Moderation */}
          <button
            type="button"
            onClick={() => setAdminTab('ads')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'ads'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>সকল বিজ্ঞাপন মডারেশন</span>
            </div>
            <span className="text-gray-400 text-[10px]">{ads.length}</span>
          </button>

          {/* 9. Settings */}
          <button
            type="button"
            onClick={() => setAdminTab('config')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminTab === 'config'
                ? 'bg-[#FF6600] text-white shadow-md shadow-orange-950'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-gray-400" />
              <span>সাইট সেটিংস ও সিকিউরিটি</span>
            </div>
          </button>

        </nav>

        {/* Sidebar Footer Actions */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF6600]" />
            <span>ওয়েবসাইটে ফিরে যান</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              onExitAdmin();
            }}
            className="w-full bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-200 hover:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            title="অ্যাডমিন থেকে লগআউট করুন"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>লগআউট (Admin Logout)</span>
          </button>
        </div>

      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F0F4F8] overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0A1128]">
              {adminTab === 'dashboard' && 'অ্যাডমিন ড্যাশবোর্ড ও রিয়েলটাইম মেট্রিক্স'}
              {adminTab === 'pending' && 'পেন্ডিং বিজ্ঞাপন ও ট্রানজেকশন অনুমোদন'}
              {adminTab === 'cancelled' && 'বাতিলকৃত ট্রানজেকশন লগ ও ফ্রড সার্চ'}
              {adminTab === 'subscription' && 'সাবস্ক্রিপশন প্যাকেজ ও মার্চেন্ট পেমেন্ট নম্বর'}
              {adminTab === 'logo' && 'ডাইনামিক লোগো ও ব্র্যান্ড ভিজ্যুয়াল'}
              {adminTab === 'ads' && 'সকল লাইভ বিজ্ঞাপন তালিকা ও মডারেশন'}
              {adminTab === 'config' && 'সাইট কনফিগারেশন ও এসইও মেটা'}
            </h2>
            <p className="text-[11px] text-gray-500">
              ফায়ারবেস ক্লাউড ডেটাবেস • লাইভ সিকিউর সিঙ্ক
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-[#FF6600] hover:bg-[#e65c00] disabled:bg-gray-300 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-200 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
            </button>
          </div>
        </header>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {adminTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top 5 KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Active Users */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold">মোট সক্রিয় ইউজার</span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-[#0A1128]">
                    {toBengaliNumber(stats.totalUsers)}
                  </div>
                  <span className="text-[10px] text-gray-400">নিবন্ধিত ও সক্রিয় বিক্রেতা</span>
                </div>

                {/* 2. Running Ads */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold">লাইভ বিজ্ঞাপন</span>
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {toBengaliNumber(stats.activeAdsCount)}
                  </div>
                  <span className="text-[10px] text-gray-400">পাবলিক হোমপেজে দৃশ্যমান</span>
                </div>

                {/* 3. Pending Review Ads */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
                  <div className="flex items-center justify-between text-amber-800 mb-2">
                    <span className="text-xs font-bold">পেন্ডিং রিভিউ (In Review)</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-900">
                    {toBengaliNumber(stats.pendingAdsCount)}
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold">TrxID যাচাইয়ের অপেক্ষায়</span>
                </div>

                {/* 4. Premium Ads */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold">পেইড প্রিমিয়াম বিজ্ঞাপন</span>
                    <Sparkles className="w-4 h-4 text-[#FF6600]" />
                  </div>
                  <div className="text-2xl font-black text-[#FF6600]">
                    {toBengaliNumber(stats.premiumAdsCount)}
                  </div>
                  <span className="text-[10px] text-gray-400">টপ পজিশন প্যাকেজযুক্ত</span>
                </div>

                {/* 5. Total Revenue */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs">
                  <div className="flex items-center justify-between text-gray-500 mb-2">
                    <span className="text-xs font-bold">যাচাইকৃত আয় (Revenue)</span>
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700">
                    ৳ {toBengaliNumber(stats.totalRevenue)}
                  </div>
                  <span className="text-[10px] text-gray-400">বিকাশ/নগদ সফল পেমেন্ট</span>
                </div>
              </div>

              {/* Pending Action Banner if items need approval */}
              {pendingItems.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#0A1128]">
                        {pendingItems.length} টি বিজ্ঞাপন যাচাইয়ের অপেক্ষায় রয়েছে!
                      </h3>
                      <p className="text-xs text-gray-600">
                        ব্যবহারকারীরা বিকাশ/নগদে ফি পরিশোধ করে TrxID জমা দিয়েছেন। এখনই যাচাই করে লাইভ প্রকাশ করুন।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAdminTab('pending')}
                    className="bg-[#0A1128] hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    <span>পেন্ডিং তালিকায় যান</span>
                    <ArrowUpRight className="w-4 h-4 text-[#FF6600]" />
                  </button>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setAdminTab('subscription')}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-[#FF6600] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0A1128] mb-1">পেমেন্ট নম্বর ও প্যাকেজ পরিবর্তন</h4>
                  <p className="text-xs text-gray-500">বিকাশ ও নগদ মার্চেন্ট নম্বর এবং ১ দিন, ৩ দিন ও ৭ দিনের প্রাইসিং আপডেট করুন।</p>
                </div>

                <div 
                  onClick={() => setAdminTab('logo')}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-[#FF6600] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0A1128] mb-1">লোগো পরিবর্তন</h4>
                  <p className="text-xs text-gray-500">কম্পিউটার থেকে সরাসরি লোগো ফাইল আপলোড অথবা ইমেজ লিংক দিয়ে ব্যানার লোগো পরিবর্তন করুন।</p>
                </div>

                <div 
                  onClick={() => setAdminTab('ads')}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-[#FF6600] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0A1128] mb-1">বিজ্ঞাপন ডিলিট ও মডারেশন</h4>
                  <p className="text-xs text-gray-500">অਣকাঙ্ক্ষিত বা ভুয়া বিজ্ঞাপন সার্চ করে একক ক্লিকে স্থায়ীভাবে মুছে ফেলুন।</p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PENDING ADS VERIFICATION */}
          {adminTab === 'pending' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#0A1128]">
                    পেন্ডিং বিজ্ঞাপন যাচাই ও অনুমোদন তালিকা ({pendingItems.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    ইউজারের প্রেরিত TrxID ও পেমেন্ট বিকাশ/নগদ স্টেটমেন্টের সাথে মিলিয়ে অনুমোদন দিন।
                  </p>
                </div>
              </div>

              {pendingItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-base text-[#0A1128] mb-1">কোনো পেন্ডিং বিজ্ঞাপন নেই!</h4>
                  <p className="text-xs text-gray-500">সব বিজ্ঞাপন সফলভাবে যাচাই ও লাইভ রয়েছে।</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pendingItems.map(({ ad, trx, pendingPayment }) => (
                    <div 
                      key={ad.id} 
                      className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Ad Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <img
                          src={ad.images[0]}
                          alt={ad.title}
                          className="w-20 h-20 rounded-xl object-cover bg-slate-900 shrink-0 border border-gray-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">
                              ⏳ In Review
                            </span>
                            {(ad.packageName || pendingPayment?.packageName) && (
                              <span className="bg-orange-100 text-[#FF6600] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {ad.packageName || pendingPayment?.packageName}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-500">
                              ক্যাটাগরি: <b>{ad.category}</b>
                            </span>
                          </div>

                          <h4 className="font-bold text-sm sm:text-base text-[#0A1128] truncate">
                            {ad.title}
                          </h4>

                          <div className="text-xs text-gray-600 flex items-center gap-3 flex-wrap">
                            <span>বিক্রেতা: <b>{ad.sellerName}</b> ({ad.phone})</span>
                            <span>মূল্য: <b className="text-[#FF6600]">{formatTakaPrice(ad.price)}</b></span>
                            <span>লোকেশন: {ad.upazila}, {ad.district}</span>
                          </div>

                          {/* Transaction Verification Box */}
                          <div className="bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs text-[#0A1128] flex items-center gap-4 flex-wrap mt-1.5">
                            <div>
                              <span className="text-gray-500 text-[10px] block">পেমেন্ট মেথড:</span>
                              <b className="uppercase text-emerald-700">{pendingPayment?.gateway || ad.paymentMethod || trx?.paymentMethod || 'bKash'}</b>
                            </div>
                            {(pendingPayment?.amount || trx?.amount) && (
                              <div>
                                <span className="text-gray-500 text-[10px] block">পরিমাণ:</span>
                                <b className="text-[#0A1128]">{formatTakaPrice(pendingPayment?.amount || trx?.amount || 0)}</b>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500 text-[10px] block">প্রেরক মোবাইল নম্বর:</span>
                              <b className="text-[#0A1128]">{pendingPayment?.userPhone || trx?.senderNumber || ad.phone}</b>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] block">ট্রানজেকশন আইডি (TrxID):</span>
                              <code className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded text-xs">
                                {pendingPayment?.transactionId || ad.paymentTrxId || trx?.trxId || 'N/A'}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Approval / Rejection Action Buttons */}
                      <div className="flex md:flex-col items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleApproveAd(ad.id, trx?.id, pendingPayment?.id)}
                          disabled={isSaving}
                          className="flex-1 md:w-44 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>যাচাই ও অনুমোদন করুন</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectionTarget({ 
                            adId: ad.id, 
                            trxId: trx?.id, 
                            pendingPaymentId: pendingPayment?.id,
                            title: ad.title 
                          })}
                          disabled={isSaving}
                          className="flex-1 md:w-44 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>বাতিল করুন</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: CANCELLED LOGS & SEARCH */}
          {adminTab === 'cancelled' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#0A1128]">
                    বাতিলকৃত ট্রানজেকশন লগ ও ফ্রড সার্চ ({cancelledItems.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    জাল TrxID, ভুল নম্বর বা ব্যর্থ পেমেন্টের রেকর্ড সংরক্ষণ।
                  </p>
                </div>

                {/* Search in cancelled logs */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cancelledSearchQuery}
                    onChange={(e) => setCancelledSearchQuery(e.target.value)}
                    placeholder="TrxID, মোবাইল নম্বর বা নাম দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              {cancelledItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center shadow-xs">
                  <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">কোনো বাতিলকৃত লগ পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">তারিখ ও সময়</th>
                          <th className="p-3">বিজ্ঞাপন / ইউজার</th>
                          <th className="p-3">মেথড ও নম্বর</th>
                          <th className="p-3">TrxID</th>
                          <th className="p-3">টাকার পরিমাণ</th>
                          <th className="p-3">স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cancelledItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="p-3 text-gray-500 whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleString('bn-BD')}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-[#0A1128] block">{item.adTitle}</span>
                              <span className="text-[11px] text-gray-500">{item.userName} ({item.userPhone})</span>
                            </td>
                            <td className="p-3">
                              <span className="uppercase font-bold text-purple-700 block">{item.paymentMethod}</span>
                              <span className="text-gray-600">{item.senderNumber}</span>
                            </td>
                            <td className="p-3">
                              <code className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded">
                                {item.trxId}
                              </code>
                            </td>
                            <td className="p-3 font-bold text-[#0A1128]">
                              ৳ {toBengaliNumber(item.amount || 0)}
                            </td>
                            <td className="p-3">
                              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                প্রত্যাখ্যাত (Rejected)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SUBSCRIPTION PACKAGES & PAYMENT NUMBERS */}
          {adminTab === 'subscription' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* bKash & Nagad Merchant Numbers */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#FF6600]" />
                  <h3 className="text-sm sm:text-base font-black text-[#0A1128]">
                    মার্চেন্ট / পার্সোনাল পেমেন্ট নম্বর সেটিংস
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  বিজ্ঞাপন পোস্ট করার সময় ইউজাররা এই নম্বরগুলোতে Send Money বা পেমেন্ট করে TrxID পাঠাবে।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">
                      বিকাশ নম্বর (bKash Number):
                    </label>
                    <input
                      type="text"
                      value={bkashNumber}
                      onChange={(e) => setBkashNumber(e.target.value)}
                      placeholder="01956629330"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">
                      নগদ নম্বর (Nagad Number):
                    </label>
                    <input
                      type="text"
                      value={nagadNumber}
                      onChange={(e) => setNagadNumber(e.target.value)}
                      placeholder="01956629330"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600]"
                    />
                  </div>
                </div>
              </div>

              {/* Packages Pricing Table */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#FF6600]" />
                    <h3 className="text-sm sm:text-base font-black text-[#0A1128]">
                      পেইড সাবস্ক্রিপশন প্যাকেজ কনফিগারেশন
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {packages.map((pkg, idx) => (
                    <div key={pkg.id} className="border border-gray-200 p-4 rounded-2xl bg-slate-50/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">প্যাকেজ #{idx + 1}</span>
                        {pkg.isPopular && (
                          <span className="bg-[#FF6600] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            জনপ্রিয়
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">প্যাকেজের নাম:</label>
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={(e) => {
                            const updated = [...packages];
                            updated[idx].name = e.target.value;
                            setPackages(updated);
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">মেয়াদ (দিন):</label>
                          <input
                            type="number"
                            value={pkg.days}
                            onChange={(e) => {
                              const updated = [...packages];
                              updated[idx].days = Number(e.target.value);
                              setPackages(updated);
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">মূল্য (৳ BDT):</label>
                          <input
                            type="number"
                            value={pkg.price}
                            onChange={(e) => {
                              const updated = [...packages];
                              updated[idx].price = Number(e.target.value);
                              setPackages(updated);
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#FF6600]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    প্যাকেজ সেটিংস সেভ করুন
                  </button>
                </div>
              </div>

              {/* CATEGORY-WISE PROMO PRICING SETUP */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#FF6600]" />
                    <h3 className="text-sm sm:text-base font-black text-[#0A1128]">
                      ক্যাটাগরি-ভিত্তিক প্রমোশন প্রাইসিং (Category-wise Pricing Setup)
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    প্রতিটি ক্যাটাগরির জন্য আলাদা দাম নির্ধারণ করুন
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  ব্যবহারকারী যখন কোনো নির্দিষ্ট ক্যাটাগরিতে বিজ্ঞাপন পোস্ট করবে, তখন সেই ক্যাটাগরির জন্য নির্ধারিত প্রমোশন ফি প্রদর্শিত হবে।
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[#0A1128] font-bold border-b border-gray-200">
                        <th className="py-2.5 px-3 rounded-l-xl">ক্যাটাগরি</th>
                        <th className="py-2.5 px-3 text-center">TOP প্রমো (৭ দিন) ৳</th>
                        <th className="py-2.5 px-3 text-center">TOP প্রমো (৩০ দিন) ৳</th>
                        <th className="py-2.5 px-3 text-center">Boost Premium (১ মাস) ৳</th>
                        <th className="py-2.5 px-3 text-right rounded-r-xl">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CATEGORIES_LIST.filter(c => c.id !== 'all').map((cat) => {
                        const pricing = categoryPricing[cat.name] || categoryPricing[cat.id] || DEFAULT_CATEGORY_PROMO_PRICES[cat.name] || DEFAULT_CATEGORY_PROMO_PRICES['default'];
                        return (
                          <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-bold text-[#0A1128]">
                              {cat.name}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={pricing.top7}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCategoryPricing(prev => ({
                                    ...prev,
                                    [cat.name]: {
                                      ...pricing,
                                      top7: val
                                    }
                                  }));
                                }}
                                className="w-24 px-2.5 py-1 text-center bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:border-[#FF6600] focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={pricing.top30}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCategoryPricing(prev => ({
                                    ...prev,
                                    [cat.name]: {
                                      ...pricing,
                                      top30: val
                                    }
                                  }));
                                }}
                                className="w-24 px-2.5 py-1 text-center bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#FF6600] focus:border-[#FF6600] focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={pricing.boostMonth}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCategoryPricing(prev => ({
                                    ...prev,
                                    [cat.name]: {
                                      ...pricing,
                                      boostMonth: val
                                    }
                                  }));
                                }}
                                className="w-28 px-2.5 py-1 text-center bg-white border border-gray-300 rounded-lg text-xs font-black text-amber-600 focus:border-[#FF6600] focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const def = DEFAULT_CATEGORY_PROMO_PRICES[cat.name] || DEFAULT_CATEGORY_PROMO_PRICES['default'];
                                  setCategoryPricing(prev => ({
                                    ...prev,
                                    [cat.name]: { ...def }
                                  }));
                                  showStatus(`${cat.name} প্রাইসিং ডিফল্টে রিসেট করা হয়েছে`, 'success');
                                }}
                                className="text-[10px] text-gray-500 hover:text-red-500 hover:underline cursor-pointer"
                              >
                                ডিফল্ট রিসেট
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                  <span className="text-[11px] text-gray-500">
                    * মান পরিবর্তন করার পর অবশ্যই নিচে "সংরক্ষণ করুন" বাটনে ক্লিক করুন।
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-[#0A1128] hover:bg-black text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-[#FF6600]" />
                    <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি প্রাইসিং সেভ করুন'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: LOGO & BRANDING */}
          {adminTab === 'logo' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#FF6600]" />
                  <h3 className="text-sm sm:text-base font-black text-[#0A1128]">
                    ওয়েবসাইট লোগো পরিবর্তন ও ইনস্ট্যান্ট লাইভ প্রিভিউ
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  স্বচ্ছ ব্যাকগ্রাউন্ডের (Transparent PNG) লোগো আপলোড করলে ওয়েবসাইট হেডার ও ফুটারে তাৎক্ষণিকভাবে আপডেট হয়ে যাবে।
                </p>

                {/* Live Preview Box */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-slate-50 text-center space-y-3">
                  <span className="text-xs font-bold text-gray-500 block">বর্তমান লোগো প্রিভিউ (হেডার ও ফুটার):</span>
                  
                  {/* Light Background Check */}
                  <div className="p-3 bg-white rounded-2xl shadow-xs border border-gray-200 max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-gray-400 font-semibold">লাইট হেডার মোড:</span>
                    <div className="h-14 flex items-center justify-center p-2">
                      {logoPreview || customLogoUrl ? (
                        <img
                          src={logoPreview || customLogoUrl}
                          alt="Site Logo"
                          className="max-h-12 max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-[#FF6600] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs">
                            BK
                          </div>
                          <span className="text-lg font-black text-[#0A1128]">
                            BechoKino<span className="text-[#FF6600]">.com</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dark Background Check for Footer */}
                  <div className="p-3 bg-[#0A1128] rounded-2xl shadow-xs border border-slate-700 max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold">ডার্ক ফুটার মোড (স্বচ্ছতা যাচাই):</span>
                    <div className="h-14 flex items-center justify-center p-2">
                      {logoPreview || customLogoUrl ? (
                        <img
                          src={logoPreview || customLogoUrl}
                          alt="Site Logo"
                          className="max-h-12 max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-[#FF6600] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs">
                            BK
                          </div>
                          <span className="text-lg font-black text-white">
                            Becho<span className="text-[#FF6600]">Kino</span><span className="text-slate-400">.com</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload from Computer & URL Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* 1. File Upload */}
                  <div className="border border-gray-200 p-4 rounded-2xl bg-white space-y-3">
                    <label className="block text-xs font-bold text-[#0A1128]">
                      ১. কম্পিউটার/মোবাইল থেকে সরাসরি লোগো ফাইল আপলোড:
                    </label>
                    <label className="w-full bg-orange-50/70 hover:bg-orange-100/70 border-2 border-dashed border-orange-300 py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer transition">
                      <Upload className="w-5 h-5 text-[#FF6600]" />
                      <span>{selectedLogoFile ? selectedLogoFile.name : 'লোগো ফাইল নির্বাচন করুন (PNG / JPG / WebP)'}</span>
                      <span className="text-[10px] text-gray-500 font-normal">ক্লিক করে ফাইল সিলেক্ট করুন</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileSelect}
                      />
                    </label>
                    <p className="text-[11px] text-gray-400">সর্বোচ্চ সাইজ ৫ মেগাবাইট। ট্রান্সপারেন্ট PNG লোগো সেরা দেখায়।</p>
                  </div>

                  {/* 2. Image URL */}
                  <div className="border border-gray-200 p-4 rounded-2xl bg-white space-y-3">
                    <label className="block text-xs font-bold text-[#0A1128]">
                      ২. অথবা লোগো ইমেজ URL লিংক প্রদান করুন:
                    </label>
                    <input
                      type="url"
                      value={customLogoUrl}
                      onChange={(e) => {
                        setCustomLogoUrl(e.target.value);
                        setLogoPreview(e.target.value || null);
                      }}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResetToDefaultLogo}
                        className="text-xs text-gray-500 hover:text-red-500 underline cursor-pointer"
                      >
                        ডিফল্ট BK লোগোতে ফিরিয়ে নিন
                      </button>
                    </div>
                  </div>

                </div>

                {/* Primary Dedicated Save Logo Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-gray-200">
                  <div className="text-xs text-gray-600">
                    লোগো নির্বাচন করার পর ক্লাউড ফায়ারবেসে স্থায়ী করতে সেভ বাটনে চাপুন।
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLogoUploadAndSave()}
                    disabled={isUploadingLogo || isSaving}
                    id="btn-admin-save-logo"
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#FF6600] hover:bg-[#e65c00] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>আপলোড ও সেভ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>লোগো সেভ ও লাইভ আপডেট করুন</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Upload Gateway Images (bKash & Nagad) Section */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#E2136E] flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4 text-[#E2136E]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#0A1128]">
                      পেমেন্ট গেটওয়ে লোগো আপলোড (Upload Gateway Images)
                    </h3>
                    <p className="text-xs text-gray-500">
                      বিকাশ (bKash) ও নগদ (Nagad) এর জন্য কাস্টম লোগো ইমেজ আপলোড করুন যা পেমেন্ট পেজে প্রদর্শিত হবে।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* bKash Upload */}
                  <div className="p-4 rounded-2xl border-2 border-pink-100 bg-pink-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#E2136E]">১. বিকাশ লোগো (bKash Logo)</span>
                      {bkashLogoUrl && (
                        <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full">কাস্টম সক্রিয়</span>
                      )}
                    </div>
                    
                    <div className="h-16 bg-white rounded-xl border border-pink-200 flex items-center justify-center p-2">
                      <img 
                        src={bkashLogoUrl || 'https://1000logos.net/wp-content/uploads/2021/02/Bikash-logo.png'} 
                        alt="bKash Preview" 
                        className="max-h-12 max-w-[140px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <label className="w-full bg-white hover:bg-pink-50 border border-dashed border-[#E2136E]/40 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#E2136E] cursor-pointer transition">
                        {isUploadingGateway === 'bkash' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#E2136E]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#E2136E]" />
                        )}
                        <span>{isUploadingGateway === 'bkash' ? 'আপলোড হচ্ছে...' : 'bKash লোগো আপলোড করুন'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingGateway === 'bkash'}
                          onChange={(e) => handleUploadGatewayFile(e, 'bkash')}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Nagad Upload */}
                  <div className="p-4 rounded-2xl border-2 border-orange-100 bg-orange-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#F7941D]">২. নগদ লোগো (Nagad Logo)</span>
                      {nagadLogoUrl && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">কাস্টম সক্রিয়</span>
                      )}
                    </div>

                    <div className="h-16 bg-white rounded-xl border border-orange-200 flex items-center justify-center p-2">
                      <img 
                        src={nagadLogoUrl || 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png'} 
                        alt="Nagad Preview" 
                        className="max-h-12 max-w-[140px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <label className="w-full bg-white hover:bg-orange-50 border border-dashed border-[#F7941D]/40 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#F7941D] cursor-pointer transition">
                        {isUploadingGateway === 'nagad' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#F7941D]" />
                        )}
                        <span>{isUploadingGateway === 'nagad' ? 'আপলোড হচ্ছে...' : 'Nagad লোগো আপলোড করুন'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingGateway === 'nagad'}
                          onChange={(e) => handleUploadGatewayFile(e, 'nagad')}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: USER MANAGEMENT & SEARCH */}
          {adminTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs">
                <div>
                  <h3 className="text-base font-black text-[#0A1128] flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-600" />
                    <span>ইউজার ম্যানেজমেন্ট ও ভেরিফিকেশন ({usersList.length})</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">ব্যবহারকারীদের অ্যাকাউন্ট অনুমোদন, সাসপেন্ড, ব্যান অথবা ফায়ারবেস থেকে রিমুভ করুন।</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="নাম, মোবাইল নম্বর বা ইমেইল দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              {/* User Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    userStatusFilter === 'all'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  সকল ইউজার ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    userStatusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span>অপেক্ষমাণ অনুমোদন</span>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {usersList.filter(u => u.status === 'pending').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    userStatusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  সক্রিয় ইউজার ({usersList.filter(u => u.status === 'active' || (!u.status && u.status !== 'banned' && u.status !== 'suspended' && u.status !== 'pending')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('suspended')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    userStatusFilter === 'suspended'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-white text-amber-800 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  স্থগিত / সাসপেন্ড ({usersList.filter(u => u.status === 'suspended').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('banned')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    userStatusFilter === 'banned'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white text-red-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  ব্যানকৃত ({usersList.filter(u => u.status === 'banned').length})
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {usersList
                  .filter((u) => {
                    if (userStatusFilter === 'pending') return u.status === 'pending';
                    if (userStatusFilter === 'active') return u.status === 'active' || (!u.status && u.status !== 'banned' && u.status !== 'suspended' && u.status !== 'pending');
                    if (userStatusFilter === 'suspended') return u.status === 'suspended';
                    if (userStatusFilter === 'banned') return u.status === 'banned';
                    return true;
                  })
                  .filter((u) => {
                    const q = userSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                      (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.email && u.email.toLowerCase().includes(q)) ||
                      (u.phoneNumber && u.phoneNumber.includes(q)) ||
                      (u.phone && u.phone.includes(q)) ||
                      (u.uid && u.uid.toLowerCase().includes(q))
                    );
                  })
                  .map((usr) => (
                    <div key={usr.uid} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {usr.photoURL ? (
                          <img
                            src={usr.photoURL}
                            alt={usr.displayName || usr.name || 'User'}
                            className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 border border-gray-300 flex items-center justify-center text-slate-700 font-bold text-base shrink-0">
                            {(usr.displayName || usr.name || usr.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm text-[#0A1128] truncate">{usr.displayName || usr.name || 'নামহীন ব্যবহারকারী'}</h4>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              usr.status === 'banned' ? 'bg-red-100 text-red-700 border border-red-300' :
                              usr.status === 'suspended' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              usr.status === 'pending' ? 'bg-amber-200 text-amber-950 border border-amber-400 font-bold animate-pulse' :
                              usr.status === 'scheduled_for_deletion' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            }`}>
                              {usr.status === 'banned' ? '🚫 Banned' :
                               usr.status === 'suspended' ? `⏳ Suspended (${usr.suspendedUntil ? new Date(usr.suspendedUntil).toLocaleDateString('bn-BD') : '10d'})` :
                               usr.status === 'pending' ? '⏳ অপেক্ষমাণ ভেরিফিকেশন' :
                               usr.status === 'scheduled_for_deletion' ? '⚠️ Soft Delete' :
                               '✓ Active'}
                            </span>
                            {usr.role === 'admin' && (
                              <span className="text-[10px] bg-[#0A1128] text-white px-2 py-0.5 rounded-full font-bold">Admin</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-2 flex-wrap">
                            {(usr.phoneNumber || usr.phone) && <span>📞 {usr.phoneNumber || usr.phone}</span>}
                            {usr.email && <span>✉️ {usr.email}</span>}
                            <span className="text-[10px] text-gray-400">UID: {usr.uid.substring(0, 10)}...</span>
                          </p>
                        </div>
                      </div>

                      {/* Action Controls - Strictly Firestore-Only */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {usr.status === 'pending' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateUserAccountStatus(usr.uid, 'active');
                                showStatus(`${usr.displayName || usr.name || 'ইউজার'}-এর অ্যাকাউন্ট সফলভাবে অনুমোদন (Approved) করা হয়েছে!`, 'success');
                              } catch (err: any) {
                                showStatus(err.message || 'ব্যর্থ হয়েছে', 'error');
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>অনুমোদন দিন (Approve)</span>
                          </button>
                        )}

                        {usr.status !== 'active' && usr.status !== 'pending' && usr.status && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateUserAccountStatus(usr.uid, 'active');
                                showStatus(`${usr.displayName || usr.name || 'ইউজার'} সক্রিয় করা হয়েছে।`, 'success');
                              } catch (err: any) {
                                showStatus(err.message || 'ব্যর্থ হয়েছে', 'error');
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition border border-emerald-200 cursor-pointer"
                          >
                            সক্রিয় / আনব্যান করুন
                          </button>
                        )}

                        {usr.status !== 'suspended' && (
                          <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200">
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={customSuspendDays[usr.uid] ?? 7}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setCustomSuspendDays(prev => ({ ...prev, [usr.uid]: val }));
                              }}
                              className="w-12 bg-white text-center font-bold text-xs py-1 rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              title="সাসপেন্ডের মেয়াদ (দিন)"
                            />
                            <span className="text-[11px] font-bold text-amber-900 pr-1">দিন</span>
                            <button
                              type="button"
                              onClick={async () => {
                                const days = customSuspendDays[usr.uid] ?? 7;
                                if (confirm(`${usr.displayName || usr.name || 'ইউজার'}-কে ${days} দিনের জন্য সাময়িক স্থগিত (Suspend) করবেন?`)) {
                                  try {
                                    await updateUserAccountStatus(usr.uid, 'suspended', days);
                                    showStatus(`${usr.displayName || usr.name || 'ইউজার'}-কে ${days} দিনের জন্য স্থগিত করা হয়েছে।`, 'success');
                                  } catch (err: any) {
                                    showStatus(err.message || 'ব্যর্থ হয়েছে', 'error');
                                  }
                                }
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                            >
                              সাসপেন্ড
                            </button>
                          </div>
                        )}

                        {usr.status !== 'banned' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`সাবধান! আপনি কি নিশ্চিতভাবে ${usr.displayName || usr.name || 'ইউজার'}-কে স্থায়ী ব্যান (Ban Permanently) করতে চান?`)) {
                                try {
                                  await updateUserAccountStatus(usr.uid, 'banned');
                                  showStatus(`${usr.displayName || usr.name || 'ইউজার'}-কে স্থায়ী ব্যান করা হয়েছে।`, 'success');
                                } catch (err: any) {
                                  showStatus(err.message || 'ব্যর্থ হয়েছে', 'error');
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition border border-red-200 cursor-pointer"
                          >
                            স্থায়ী ব্যান
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`আপনি কি নিশ্চিত যে Firestore থেকে ${usr.displayName || usr.name || 'এই ব্যবহারকারী'}-এর ডকুমেন্ট ডিলিট করবেন?`)) {
                              try {
                                await deleteUserDoc(usr.uid);
                                showStatus(`${usr.displayName || usr.name || 'ইউজার'} Firestore থেকে সফলভাবে মুছে ফেলা হয়েছে।`, 'success');
                              } catch (err: any) {
                                showStatus(err.message || 'ডিলিট করতে ব্যর্থ হয়েছে', 'error');
                              }
                            }
                          }}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 font-bold text-xs rounded-xl transition cursor-pointer"
                          title="ইউজার ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                {usersList.length === 0 && (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 text-gray-400">
                    কোন ইউজার তথ্য পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REPORTS & COMPLAINTS */}
          {adminTab === 'reports' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs">
                <div>
                  <h3 className="text-base font-black text-[#0A1128] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>ইউজার ও বিজ্ঞাপনের অভিযোগসমূহ ({reportsList.length})</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">ব্যবহারকারীদের পাঠানো রিপোর্ট পর্যালোচনা করুন ও দ্রুত ব্যবস্থা নিন।</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    placeholder="অভিযোগ খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {reportsList
                  .filter((r) => {
                    const q = reportSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (r.reason && r.reason.toLowerCase().includes(q)) ||
                      (r.details && r.details.toLowerCase().includes(q)) ||
                      (r.reportedUserName && r.reportedUserName.toLowerCase().includes(q)) ||
                      (r.adTitle && r.adTitle.toLowerCase().includes(q))
                    );
                  })
                  .map((rep) => (
                    <div key={rep.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              rep.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              rep.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {rep.status === 'pending' ? '⏳ অপেক্ষমাণ (Pending)' :
                               rep.status === 'resolved' ? '✓ সমাধানকৃত (Resolved)' :
                               '✕ খারিজ (Dismissed)'}
                            </span>
                            <span className="text-xs font-black text-red-600">কারণ: {rep.reason}</span>
                          </div>
                          <p className="text-xs text-gray-700 mt-1.5">
                            <span className="font-bold">অভিযুক্ত: </span> {rep.reportedUserName || rep.reportedUserId || 'অজ্ঞাত'}
                            {rep.adTitle && <span className="text-gray-500"> | বিজ্ঞাপন: "{rep.adTitle}"</span>}
                          </p>
                          {rep.details && (
                            <p className="text-xs text-gray-600 bg-slate-50 p-2 rounded-xl mt-1.5 border border-gray-200">
                              "{rep.details}"
                            </p>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400">
                          {new Date(rep.createdAt).toLocaleDateString('bn-BD')}
                        </span>
                      </div>

                      {/* Moderation Actions for Report */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                        {rep.reportedUserId && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`অভিযুক্তকে ১০ দিনের জন্য সাসপেন্ড করবেন?`)) {
                                  await updateUserAccountStatus(rep.reportedUserId!, 'suspended', 10);
                                  await updateReportStatus(rep.id, 'resolved', '১০ দিনের জন্য সাসপেন্ড করা হয়েছে');
                                  showStatus('অভিযুক্তকে ১০ দিনের জন্য সাসপেন্ড এবং রিপোর্ট সমাধান করা হয়েছে।', 'success');
                                }
                              }}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 cursor-pointer"
                            >
                              ১০ দিন সাসপেন্ড
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`অভিযুক্তকে স্থায়ী ব্যান করবেন?`)) {
                                  await updateUserAccountStatus(rep.reportedUserId!, 'banned');
                                  await updateReportStatus(rep.id, 'resolved', 'স্থায়ীভাবে ব্যান করা হয়েছে');
                                  showStatus('অভিযুক্তকে স্থায়ী ব্যান করা হয়েছে।', 'success');
                                }
                              }}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 cursor-pointer"
                            >
                              স্থায়ী ব্যান
                            </button>
                          </>
                        )}

                        {rep.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await updateReportStatus(rep.id, 'resolved', 'সমস্যার সমাধান হয়েছে');
                                showStatus('রিপোর্ট সমাধান চিহ্নিত হয়েছে।', 'success');
                              }}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 cursor-pointer"
                            >
                              সমাধান চিহ্নিত করুন
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await updateReportStatus(rep.id, 'dismissed', 'অপ্রাসঙ্গিক রিপোর্ট');
                                showStatus('রিপোর্ট খারিজ করা হয়েছে।', 'success');
                              }}
                              className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 cursor-pointer"
                            >
                              খারিজ করুন
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                {reportsList.length === 0 && (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 text-gray-400">
                    বর্তমানে কোনো অভিযোগ বা রিপোর্ট নেই।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ALL ADS MODERATION */}
          {adminTab === 'ads' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#0A1128]">
                    বিজ্ঞাপন তালিকা ও মডারেশন ({filteredAdsList.length})
                  </h3>
                  <p className="text-xs text-gray-500">অনাকাঙ্ক্ষিত বিজ্ঞাপন খুঁজে নিয়ে স্থায়ীভাবে ডিলিট করুন।</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adSearchQuery}
                    onChange={(e) => setAdSearchQuery(e.target.value)}
                    placeholder="বিজ্ঞাপনের নাম বা ক্যাটাগরি..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredAdsList.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-2xl border border-gray-200 p-3.5 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ad.images[0]}
                        alt={ad.title}
                        className="w-14 h-14 rounded-xl object-cover bg-slate-900 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ad.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            ad.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ad.status || 'active'}
                          </span>
                          <span className="text-[11px] text-gray-400">{ad.category}</span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-[#0A1128] truncate">{ad.title}</h4>
                        <span className="text-xs font-black text-[#FF6600]">{formatTakaPrice(ad.price)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`আপনি কি নিশ্চিত যে "${ad.title}" বিজ্ঞাপনটি ডিলিট করতে চান?`)) {
                          await onDeleteAd(ad.id, 'admin123');
                          showStatus('বিজ্ঞাপনটি ডিলিট করা হয়েছে।', 'success');
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                      title="বিজ্ঞাপন ডিলিট করুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 7: SITE CONFIG & SECURITY */}
          {adminTab === 'config' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm sm:text-base font-black text-[#0A1128] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#FF6600]" />
                  <span>সাধারণ ওয়েবসাইট কনফিগারেশন</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">সাইটের নাম (Site Name):</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">ট্যাগলাইন (Tagline):</label>
                    <input
                      type="text"
                      value={siteTagline}
                      onChange={(e) => setSiteTagline(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1128] mb-1">ব্যানার সাবটাইটেল (Hero Subtitle):</label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1128] mb-1">SEO মেটা ডেসক্রিপশন (Footer/SEO Meta):</label>
                  <textarea
                    rows={3}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1128] mb-1">ঘোষণা ব্যানার টেকস্ট (Announcement Notice):</label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="যেমন: পবিত্র ঈদ উপলক্ষে বিশেষ অফার!"
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Contact CMS */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm sm:text-base font-black text-[#0A1128] flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#FF6600]" />
                  <span>যোগাযোগ ও সোশ্যাল মিডিয়া লিংক (Dynamic Footer & Contact CMS)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">সাপোর্ট ইমেইল (Support Email):</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="support@bechokino.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">সাপোর্ট ফোন নম্বর (Support Hotline):</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="01956629330"
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">ফেসবুক পেজ লিংক (Facebook URL):</label>
                    <input
                      type="url"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/bechokino"
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">টেলিগ্রাম চ্যানেল লিংক (Telegram URL):</label>
                    <input
                      type="url"
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      placeholder="https://t.me/bechokino"
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A1128] mb-1">হোয়াটসঅ্যাপ নম্বর (WhatsApp Number):</label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="01956629330"
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128]"
                    />
                  </div>
                </div>
              </div>

              {/* User Approval Policy & Moderation Config */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm sm:text-base font-black text-[#0A1128] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FF6600]" />
                  <span>ব্যবহারকারী অনুমোদন নীতিমালা (User Verification Policy)</span>
                </h3>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0A1128]">নতুন ব্যবহারকারীর জন্য অ্যাডমিন অনুমোদন বাধ্যতামূলক করুন</h4>
                    <p className="text-xs text-gray-500 mt-0.5">চালু থাকলে নতুন রেজিস্টার্ড ব্যবহারকারী পেন্ডিং থাকবে এবং অ্যাডমিন অনুমোদন না দেওয়া পর্যন্ত লগইন করতে পারবে না।</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={requireUserApproval}
                      onChange={(e) => setRequireUserApproval(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6600]"></div>
                  </label>
                </div>
              </div>

              {/* Security & Admin PIN */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm sm:text-base font-black text-[#0A1128] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#FF6600]" />
                  <span>অ্যাডমিন মাস্টার পিন পরিবর্তন</span>
                </h3>

                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-[#0A1128] mb-1">নতুন অ্যাডমিন পিন (New Admin PIN):</label>
                  <input
                    type="text"
                    value={newAdminPin}
                    onChange={(e) => setNewAdminPin(e.target.value)}
                    placeholder="admin123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-[#0A1128]"
                  />
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-[#FF6600] hover:bg-[#e05a00] text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'সকল কনফিগারেশন স্থায়ীভাবে সেভ করুন'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* REJECTION REASON MODAL */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-200">
              <XCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-[#0A1128] text-center mb-1">
              বিজ্ঞাপন বাতিলের কারণ নির্বাচন
            </h3>
            
            <p className="text-xs text-gray-500 text-center mb-4 truncate">
              "{rejectionTarget.title}"
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-[#0A1128]">বাতিলের কারণ:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128]"
              >
                <option value="ভুল বা জাল TrxID">ভুল বা জাল TrxID</option>
                <option value="টাকা একাউন্টে জমা হয়নি">টাকা একাউন্টে জমা হয়নি</option>
                <option value="অসম্পূর্ণ পেমেন্ট">অসম্পূর্ণ পেমেন্ট</option>
                <option value="নিষিদ্ধ পণ্য বা নিয়ম লঙ্ঘন">নিষিদ্ধ পণ্য বা নিয়ম লঙ্ঘন</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                onClick={handleRejectAd}
                disabled={isSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-red-200"
              >
                নিশ্চিত বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
