import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Database, 
  Image as ImageIcon, 
  KeyRound, 
  RotateCcw, 
  Save, 
  Settings, 
  ShieldCheck, 
  Sparkles, 
  Upload, 
  X,
  LayoutDashboard,
  Layers,
  Trash2,
  Search,
  Eye,
  Activity,
  Users,
  TrendingUp,
  FileText,
  Lock,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneCall,
  AlertCircle,
  DollarSign,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { Ad, PaymentTransaction, SiteSettings, SubscriptionPackage } from '../types';
import { 
  updateFirestoreSiteSettings, 
  deleteFirestoreAd, 
  subscribeToTransactions, 
  updatePaymentTransactionStatus,
  uploadLogoAndSave,
  DEFAULT_PACKAGES 
} from '../lib/firebase';
import { formatTakaPrice, toBengaliNumber } from './AdCard';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  totalAdsCount: number;
  ads?: Ad[];
  onDeleteAd?: (adId: string, pin: string) => Promise<boolean>;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  totalAdsCount,
  ads = [],
  onDeleteAd
}) => {
  const [adminPin, setAdminPin] = useState('admin123');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'cancelled' | 'subscription' | 'logo' | 'ads' | 'config'>('dashboard');
  
  // Settings Form State
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteTagline, setSiteTagline] = useState(settings.siteTagline);
  const [bannerSubtitle, setBannerSubtitle] = useState(settings.bannerSubtitle);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [customLogoUrl, setCustomLogoUrl] = useState(settings.logoUrl || '');
  const [announcementText, setAnnouncementText] = useState(settings.announcementText);
  const [bkashNumber, setBkashNumber] = useState(settings.bkashNumber || '01956629330');
  const [nagadNumber, setNagadNumber] = useState(settings.nagadNumber || '01956629330');
  const [packages, setPackages] = useState<SubscriptionPackage[]>(settings.packages || DEFAULT_PACKAGES);

  // Transactions State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [cancelledSearchQuery, setCancelledSearchQuery] = useState('');
  
  // Ad Management search filter
  const [adSearchQuery, setAdSearchQuery] = useState('');
  
  // Feedback UI
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const unsub = subscribeToTransactions((trxs) => {
        setTransactions(trxs);
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Derived real-time statistics
  const stats = useMemo(() => {
    // Unique user count (unique phone/userId)
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
    const verifiedTrxCount = transactions.filter(t => t.status === 'verified').length;
    const rejectedTrxCount = transactions.filter(t => t.status === 'rejected').length;
    const premiumAdsCount = ads.filter(a => a.paymentStatus === 'verified' || a.packageId).length;
    const totalRevenue = transactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalUsers,
      activeAdsCount,
      pendingAdsCount: Math.max(pendingAdsCount, pendingTrxCount),
      premiumAdsCount,
      verifiedTrxCount,
      rejectedTrxCount,
      totalRevenue
    };
  }, [ads, transactions]);

  // Pending items list (Combining pending ads & pending transactions)
  const pendingItems = useMemo(() => {
    const pendingAds = ads.filter(a => a.status === 'pending');
    return pendingAds.map(ad => {
      const matchingTrx = transactions.find(t => t.adId === ad.id);
      return {
        ad,
        trx: matchingTrx
      };
    });
  }, [ads, transactions]);

  // Cancelled items list
  const cancelledItems = useMemo(() => {
    const rejectedTrxs = transactions.filter(t => t.status === 'rejected');
    const query = cancelledSearchQuery.toLowerCase().trim();
    if (!query) return rejectedTrxs;
    return rejectedTrxs.filter(t => 
      t.trxId.toLowerCase().includes(query) ||
      t.userName.toLowerCase().includes(query) ||
      t.userPhone.includes(query) ||
      t.senderNumber.includes(query) ||
      t.adTitle.toLowerCase().includes(query)
    );
  }, [transactions, cancelledSearchQuery]);

  if (!isOpen) return null;

  const handlePinAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === settings.adminPin || adminPin === 'admin123') {
      setIsAuthenticated(true);
      setStatusMessage(null);
    } else {
      setStatusMessage({ type: 'error', text: 'ভুল অ্যাডমিন পিন কোড! (ডিফল্ট পিন: admin123)' });
    }
  };

  // Direct Mobile Phone Gallery Logo File Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল সিলেক্ট করুন' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setLogoPreview(reader.result);
        setCustomLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Auto upload in background to Firebase
    try {
      const res = await uploadLogoAndSave(file);
      if (res.success && res.url) {
        setLogoPreview(res.url);
        setCustomLogoUrl(res.url);
        const updated = { ...settings, logoUrl: res.url, logoType: 'custom_image' as const };
        onUpdateSettings(updated);
        setStatusMessage({ type: 'success', text: 'লোগো সফলভাবে আপলোড ও সেভ হয়েছে!' });
      }
    } catch (err: any) {
      console.warn('Background logo upload:', err);
    }
  };

  const handlePackagePriceChange = (pkgId: string, newPrice: number) => {
    setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, price: newPrice } : p));
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        siteName: siteName.trim(),
        siteTagline: siteTagline.trim(),
        bannerSubtitle: bannerSubtitle.trim(),
        logoUrl: customLogoUrl.trim() || null,
        announcementText: announcementText.trim(),
        bkashNumber: bkashNumber.trim(),
        nagadNumber: nagadNumber.trim(),
        packages
      };

      await updateFirestoreSiteSettings(updatedSettings);
      onUpdateSettings(updatedSettings);

      setStatusMessage({
        type: 'success',
        text: 'সেটিংস এবং সাবস্ক্রিপশন প্যাকেজ সফলভাবে সংরক্ষিত হয়েছে!'
      });
    } catch (err: any) {
      console.error('Save settings error:', err);
      setStatusMessage({
        type: 'error',
        text: 'সেটিংস সেভ করতে সমস্যা হয়েছে: ' + (err.message || '')
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Verify and Publish Pending Ad
  const handleVerifyPendingAd = async (adId: string, trxId?: string) => {
    try {
      if (trxId) {
        await updatePaymentTransactionStatus(trxId, 'verified', adId);
      } else {
        await updatePaymentTransactionStatus('manual-' + adId, 'verified', adId);
      }
      setStatusMessage({
        type: 'success',
        text: 'বিজ্ঞাপনটি সফলভাবে যাচাই ও ওয়েবসাইটে প্রকাশ (Active) করা হয়েছে!'
      });
    } catch (err: any) {
      console.error('Verify error:', err);
      setStatusMessage({ type: 'error', text: 'যাচাই করতে সমস্যা হয়েছে: ' + err.message });
    }
  };

  // Reject / Cancel Pending Ad
  const handleRejectPendingAd = async (adId: string, trxId?: string) => {
    try {
      if (trxId) {
        await updatePaymentTransactionStatus(trxId, 'rejected', adId);
      } else {
        await updatePaymentTransactionStatus('manual-' + adId, 'rejected', adId);
      }
      setStatusMessage({
        type: 'success',
        text: 'বিজ্ঞাপন ও পেমেন্ট ট্রানজেকশন বাতিল (Rejected) করা হয়েছে!'
      });
    } catch (err: any) {
      console.error('Reject error:', err);
      setStatusMessage({ type: 'error', text: 'বাতিল করতে সমস্যা হয়েছে: ' + err.message });
    }
  };

  const filteredAds = ads.filter(ad => 
    ad.title.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
    ad.category.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
    ad.district.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
    ad.phone.includes(adSearchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 max-w-[100vw]">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 my-4 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#FF6600] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="block leading-tight">BechoKino অ্যাডমিন ড্যাশবোর্ড ও কন্ট্রোল প্যানেল</span>
              <span className="text-[10px] text-gray-400 font-normal">রিয়েল-টাইম পরিসংখ্যান, বিজ্ঞাপন ভেরিফিকেশন ও ট্রানজেকশন লগ</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-800 text-sm">
          
          {/* Authentication Screen */}
          {!isAuthenticated ? (
            <div className="max-w-sm mx-auto my-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto border border-orange-200">
                <Lock className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-black text-[#0A1128]">
                অ্যাডমিন প্রবেশাধিকার পিন কোড
              </h2>
              <p className="text-xs text-gray-500">
                সাইটের সেটিংস ও সাবস্ক্রিপশন পরিবর্তনের জন্য অ্যাডমিন পিন প্রদান করুন। (ডিফল্ট: <b>admin123</b>)
              </p>

              <form onSubmit={handlePinAuth} className="space-y-3">
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="অ্যাডমিন পিন লিখুন"
                  className="w-full text-center tracking-widest text-lg font-black bg-slate-50 border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                />

                {statusMessage && (
                  <p className="text-xs text-red-600 font-bold">{statusMessage.text}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#0A1128] hover:bg-black text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer shadow-md"
                >
                  প্রবেশ করুন
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Top Navigation Tabs */}
              <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2.5 overflow-x-auto no-scrollbar">
                
                {/* 1. ড্যাশবোর্ড ও পরিসংখ্যান */}
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>ড্যাশবোর্ড ও পরিসংখ্যান</span>
                </button>

                {/* 2. পেন্ডিং বিজ্ঞাপন */}
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer relative ${
                    activeTab === 'pending'
                      ? 'bg-[#FF6600] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>পেন্ডিং বিজ্ঞাপন</span>
                  {stats.pendingAdsCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {toBengaliNumber(stats.pendingAdsCount)}
                    </span>
                  )}
                </button>

                {/* 3. বাতিলকৃত ট্রানজেকশন */}
                <button
                  onClick={() => setActiveTab('cancelled')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'cancelled'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>বাতিলকৃত লগ ({stats.rejectedTrxCount})</span>
                </button>

                {/* 4. সাবস্ক্রিপশন ও নম্বর */}
                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'subscription'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>সাবস্ক্রিপশন ও নম্বর</span>
                </button>

                {/* 5. লোগো ম্যানেজমেন্ট */}
                <button
                  onClick={() => setActiveTab('logo')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'logo'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>লোগো ম্যানেজমেন্ট</span>
                </button>

                {/* 6. সকল বিজ্ঞাপন */}
                <button
                  onClick={() => setActiveTab('ads')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'ads'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>বিজ্ঞাপন তালিকা ({totalAdsCount})</span>
                </button>

                {/* 7. সেটিংস */}
                <button
                  onClick={() => setActiveTab('config')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'config'
                      ? 'bg-[#0A1128] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>সাইট সেটিংস</span>
                </button>

              </div>

              {/* Status Message Notification */}
              {statusMessage && (
                <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* TAB 1: REAL-TIME DASHBOARD & ANALYTICS */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Real-Time Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    
                    {/* 1. Total Users */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold">মোট সক্রিয় ইউজার</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-[#0A1128]">
                        {toBengaliNumber(stats.totalUsers)}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">রেজিস্টার্ড ও বিজ্ঞাপনদাতা</span>
                    </div>

                    {/* 2. Total Running Ads */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-emerald-800 mb-2">
                        <span className="text-xs font-bold">চলমান বিজ্ঞাপন (Live)</span>
                        <Activity className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                        {toBengaliNumber(stats.activeAdsCount)}
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-1">সাইটে দৃশ্যমান লাইভ অ্যাড</span>
                    </div>

                    {/* 3. Total Premium / Paid Ads */}
                    <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-orange-800 mb-2">
                        <span className="text-xs font-bold">পেইড / প্রিমিয়াম অ্যাড</span>
                        <TrendingUp className="w-4 h-4 text-[#FF6600]" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-[#FF6600]">
                        {toBengaliNumber(stats.premiumAdsCount)}
                      </div>
                      <span className="text-[10px] text-orange-700 mt-1">প্যাকেজ সাবস্ক্রাইবড অ্যাড</span>
                    </div>

                    {/* 4. Pending Reviews */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-amber-800 mb-2">
                        <span className="text-xs font-bold">পর্যালোচনায় থাকা অ্যাড</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-amber-700">
                        {toBengaliNumber(stats.pendingAdsCount)}
                      </div>
                      <span className="text-[10px] text-amber-700 mt-1">ভেরিফিকেশনের অপেক্ষায়</span>
                    </div>

                  </div>

                  {/* Revenue & Overview Banner */}
                  <div className="bg-gradient-to-r from-[#0A1128] to-[#1E293B] text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">মোট ভেরিফাইড আয়</span>
                      <div className="text-3xl font-black text-white mt-0.5">
                        {formatTakaPrice(stats.totalRevenue)}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        অনুমোদিত বিকাশ ও নগদ সাবস্ক্রিপশন ট্রানজেকশন থেকে সংগৃহীত।
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('pending')}
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shrink-0"
                    >
                      <span>পেন্ডিং রিকোয়েস্ট যাচাই করুন ({stats.pendingAdsCount})</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Action Preview */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-[#0A1128] mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FF6600]" />
                      <span>সর্বশেষ পেন্ডিং বিজ্ঞাপনের তালিকা</span>
                    </h3>

                    {pendingItems.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">
                        বর্তমানে কোনো পেন্ডিং বিজ্ঞাপন নেই। সকল বিজ্ঞাপন অনুমোদিত!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingItems.slice(0, 3).map(({ ad, trx }) => (
                          <div key={ad.id} className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={ad.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                              <div>
                                <div className="font-bold text-[#0A1128] text-xs line-clamp-1">{ad.title}</div>
                                <div className="text-[11px] text-gray-500">
                                  {ad.sellerName} • {ad.phone} • <span className="font-mono font-bold text-orange-600">TrxID: {ad.paymentTrxId || trx?.trxId || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleVerifyPendingAd(ad.id, trx?.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shrink-0"
                            >
                              যাচাই ও প্রকাশ করুন
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: PENDING ADS VERIFICATION FLOW */}
              {activeTab === 'pending' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-0.5">পেন্ডিং বিজ্ঞাপন ভেরিফিকেশন নির্দেশিকা:</p>
                      <p>ইউজারের পাঠানো বিকাশ/নগদ TrxID এবং প্রেরক নম্বর আপনার স্টেটমেন্টের সাথে মিলিয়ে নিন। সঠিক থাকলে "যাচাই ও প্রকাশ করুন" বাটনে চাপুন, বিজ্ঞাপনটি সাথে সাথে সাইটে সবার জন্য লাইভ হয়ে যাবে।</p>
                    </div>
                  </div>

                  {pendingItems.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-gray-200">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-[#0A1128] text-sm">কোনো পেন্ডিং বিজ্ঞাপন নেই</p>
                      <p className="text-xs text-gray-400 mt-1">সব ইউজার বিজ্ঞাপন যাচাই করা সম্পন্ন হয়েছে।</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingItems.map(({ ad, trx }) => (
                        <div key={ad.id} className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-xs">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <img src={ad.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" />
                              <div>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full mb-1 inline-block">
                                  ⏳ ভেরিফিকেশন পেন্ডিং (In Review)
                                </span>
                                <h3 className="font-bold text-[#0A1128] text-sm line-clamp-1">{ad.title}</h3>
                                <div className="text-xs font-black text-[#FF6600] mt-0.5">{formatTakaPrice(ad.price)}</div>
                              </div>
                            </div>

                            {/* Action Buttons: "যাচাই ও প্রকাশ করুন" and "বাতিল করুন" */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleVerifyPendingAd(ad.id, trx?.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>যাচাই ও প্রকাশ করুন</span>
                              </button>

                              <button
                                onClick={() => handleRejectPendingAd(ad.id, trx?.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>বাতিল করুন</span>
                              </button>
                            </div>
                          </div>

                          {/* Transaction Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-[10px] text-gray-500 block">বিজ্ঞাপনদাতা ও ফোন:</span>
                              <span className="font-bold text-[#0A1128]">{ad.sellerName}</span>
                              <span className="text-[11px] text-gray-600 block">{ad.phone}</span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-[10px] text-gray-500 block">প্যাকেজ ও ফি:</span>
                              <span className="font-bold text-orange-600">{ad.packageName || 'স্ট্যান্ডার্ড'}</span>
                              <span className="text-[11px] text-gray-600 block">{ad.packageDays ? `${ad.packageDays} দিন` : '৩০ দিন'}</span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-[10px] text-gray-500 block">পেমেন্ট মেথড:</span>
                              <span className="font-bold uppercase text-slate-800">{ad.paymentMethod || trx?.paymentMethod || 'bKash'}</span>
                              <span className="text-[10px] text-gray-500 block">প্রেরক: {trx?.senderNumber || ad.phone}</span>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-orange-800 font-bold block">TrxID:</span>
                              <span className="font-mono font-black text-slate-900 text-xs tracking-wider block">
                                {ad.paymentTrxId || trx?.trxId || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CANCELLED LOGS & FAKE TRX SEARCH */}
              {activeTab === 'cancelled' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cancelledSearchQuery}
                        onChange={(e) => setCancelledSearchQuery(e.target.value)}
                        placeholder="বাতিলকৃত TrxID, প্রেরক নম্বর, ইউজারের নাম বা বিজ্ঞাপনের নাম দিয়ে খুঁজুন..."
                        className="w-full bg-slate-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-red-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {cancelledItems.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-gray-200 text-xs text-gray-400">
                      কোনো বাতিলকৃত ট্রানজেকশন রেকর্ড পাওয়া যায়নি।
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[#0A1128] border-b border-gray-200">
                          <tr>
                            <th className="p-3">ইউজার ও ফোন</th>
                            <th className="p-3">বিজ্ঞাপন</th>
                            <th className="p-3">মেথড</th>
                            <th className="p-3">বাতিলকৃত TrxID ও প্রেরক</th>
                            <th className="p-3">টাকা</th>
                            <th className="p-3">তারিখ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cancelledItems.map((trx) => (
                            <tr key={trx.id} className="hover:bg-red-50/40 transition">
                              <td className="p-3">
                                <div className="font-bold text-[#0A1128]">{trx.userName}</div>
                                <div className="text-[10px] text-gray-500">{trx.userPhone}</div>
                              </td>
                              <td className="p-3 font-semibold line-clamp-1 max-w-[150px]">{trx.adTitle}</td>
                              <td className="p-3 uppercase font-bold text-[10px]">{trx.paymentMethod}</td>
                              <td className="p-3">
                                <span className="font-mono font-bold text-red-600">{trx.trxId}</span>
                                <div className="text-[10px] text-gray-500">নম্বর: {trx.senderNumber}</div>
                              </td>
                              <td className="p-3 font-bold text-gray-700">৳ {trx.amount}</td>
                              <td className="p-3 text-[10px] text-gray-400">
                                {new Date(trx.createdAt).toLocaleDateString('bn-BD')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SUBSCRIPTION & PAYMENT MANAGEMENT */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  
                  {/* Receiving Payment Numbers Box */}
                  <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-[#0A1128] flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-[#FF6600]" />
                      <span>পেমেন্ট রিসিভিং নম্বর কনফিগারেশন (Send Money)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          বিকাশ (bKash) নম্বর
                        </label>
                        <input
                          type="tel"
                          value={bkashNumber}
                          onChange={(e) => setBkashNumber(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#FF6600]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          নগদ (Nagad) নম্বর
                        </label>
                        <input
                          type="tel"
                          value={nagadNumber}
                          onChange={(e) => setNagadNumber(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#FF6600]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subscription Packages Pricing Table */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-[#0A1128] mb-3">
                      সাবস্ক্রিপশন প্যাকেজ ও মূল্য নির্ধারণ
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {packages.map((pkg) => (
                        <div key={pkg.id} className="border border-gray-200 rounded-2xl p-3 bg-slate-50">
                          <div className="font-bold text-xs text-[#0A1128] mb-1">{pkg.name}</div>
                          <div className="text-[11px] text-gray-500 mb-2">মেয়াদ: {pkg.days} দিন</div>
                          
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            মূল্য (টাকা):
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">৳</span>
                            <input
                              type="number"
                              value={pkg.price}
                              onChange={(e) => handlePackagePriceChange(pkg.id, Number(e.target.value))}
                              className="w-full bg-white border border-gray-300 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold text-[#FF6600]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-6 py-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-md transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'সংরক্ষিত হচ্ছে...' : 'প্যাকেজ সেটিংস সংরক্ষণ করুন'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 5: LOGO MANAGEMENT */}
              {activeTab === 'logo' && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 space-y-4">
                    <h3 className="text-sm font-bold text-[#0A1128]">
                      ব্র্যান্ড লোগো পরিবর্তন (Header & Footer)
                    </h3>
                    
                    {/* Live Preview */}
                    <div className="bg-[#0A1128] p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs text-gray-400">লাইভ প্রিভিউ:</span>
                      <div className="bg-white/10 p-2 rounded-xl">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="h-10 max-w-[200px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-white font-black text-xl">Becho<span className="text-[#FF6600]">Kino</span></span>
                        )}
                      </div>
                    </div>

                    {/* Upload File from Device */}
                    <div className="border-2 border-dashed border-gray-300 hover:border-[#FF6600] rounded-2xl p-4 text-center cursor-pointer transition bg-white">
                      <label className="cursor-pointer block">
                        <Upload className="w-6 h-6 text-[#FF6600] mx-auto mb-1" />
                        <span className="text-xs font-bold text-[#0A1128] block">
                          মোবাইল বা পিসি থেকে লোগো আপলোড করুন
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* URL Alternative */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        অথবা লোগো ইমেজ লিঙ্ক (URL) দিন:
                      </label>
                      <input
                        type="url"
                        value={customLogoUrl}
                        onChange={(e) => {
                          setCustomLogoUrl(e.target.value);
                          setLogoPreview(e.target.value);
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-6 py-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-md transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'সংরক্ষিত হচ্ছে...' : 'লোগো সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: ADS MODERATION */}
              {activeTab === 'ads' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adSearchQuery}
                        onChange={(e) => setAdSearchQuery(e.target.value)}
                        placeholder="বিজ্ঞাপনের শিরোনাম, ক্যাটাগরি, জেলা বা ফোন দিয়ে খুঁজুন..."
                        className="w-full bg-slate-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[#0A1128] border-b border-gray-200">
                        <tr>
                          <th className="p-3">বিজ্ঞাপন</th>
                          <th className="p-3">ক্যাটাগরি</th>
                          <th className="p-3">মূল্য</th>
                          <th className="p-3">অবস্থান</th>
                          <th className="p-3">স্ট্যাটাস</th>
                          <th className="p-3 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredAds.map((ad) => (
                          <tr key={ad.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img src={ad.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />
                                <div>
                                  <div className="font-bold text-[#0A1128] line-clamp-1">{ad.title}</div>
                                  <div className="text-[10px] text-gray-500">{ad.sellerPhone || ad.phone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-semibold">{ad.category}</td>
                            <td className="p-3 font-bold text-[#FF6600]">৳ {ad.price.toLocaleString()}</td>
                            <td className="p-3 text-[11px] text-gray-600">{ad.district}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ad.status === 'pending' ? 'bg-amber-100 text-amber-800' : (ad.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800')
                              }`}>
                                {ad.status === 'pending' ? 'পেন্ডিং' : (ad.status === 'rejected' ? 'বাতিল' : 'সক্রিয়')}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={async () => {
                                  if (confirm(`আপনি কি "${ad.title}" ডিলিট করতে চান?`)) {
                                    await deleteFirestoreAd(ad.id);
                                    if (onDeleteAd) await onDeleteAd(ad.id, 'admin');
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                title="ডিলিট করুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: GENERAL CONFIG */}
              {activeTab === 'config' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ওয়েবসাইট নাম</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ট্যাগলাইন</label>
                    <input
                      type="text"
                      value={siteTagline}
                      onChange={(e) => setSiteTagline(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ব্যানার সাবটাইটেল</label>
                    <input
                      type="text"
                      value={bannerSubtitle}
                      onChange={(e) => setBannerSubtitle(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">জরুরি নোটিশ / ঘোষণা</label>
                    <input
                      type="text"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-6 py-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-md transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'সংরক্ষিত হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
