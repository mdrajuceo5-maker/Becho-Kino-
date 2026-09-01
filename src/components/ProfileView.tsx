import React, { useState, useRef } from 'react';
import { 
  Heart, 
  HelpCircle, 
  Phone, 
  ShoppingBag, 
  User, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  Mail, 
  Smartphone, 
  Camera, 
  Plus, 
  Calendar,
  Loader2,
  Settings,
  ChevronRight,
  Bookmark,
  Edit3,
  Trash2,
  Clock,
  Eye,
  AlertCircle,
  Save,
  Check,
  ShieldAlert,
  Lock,
  ArrowLeft,
  X,
  Globe
} from 'lucide-react';
import { Ad, UserProfile, SiteSettings } from '../types';
import { AdCard } from './AdCard';
import { logoutUser, scheduleAccountDeletion, updateUserProfilePhoto } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';


interface ProfileViewProps {
  user: UserProfile | null;
  favoriteAds: Ad[];
  myAds?: Ad[];
  settings?: SiteSettings;
  onSelectAd: (ad: Ad) => void;
  onToggleFavorite: (adId: string) => void;
  myAdsCount: number;
  onOpenAdmin?: () => void;
  onOpenAuth: () => void;
  onNavigateMyAds: () => void;
  onOpenPostAd: () => void;
  onLogoutSuccess: () => void;
  onUpdateUserPhoto?: (newPhotoURL: string) => void;
  onEditAd?: (ad: Ad) => void;
  onDeleteAd?: (adId: string) => void;
}

type ProfileSection = 'overview' | 'details' | 'my_ads' | 'saved' | 'settings';

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  favoriteAds,
  myAds = [],
  settings,
  onSelectAd,
  onToggleFavorite,
  myAdsCount,
  onOpenAuth,
  onOpenPostAd,
  onLogoutSuccess,
  onUpdateUserPhoto,
  onEditAd,
  onDeleteAd
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [savedNotice, setSavedNotice] = useState(false);

  // Delete ad confirmation state
  const [adToDelete, setAdToDelete] = useState<Ad | null>(null);

  // Soft Account Deletion States
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogoutSuccess();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Handle Profile Picture File Selection & Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG, WebP) নির্বাচন করুন');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারে');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (reader.result && typeof reader.result === 'string') {
          const photoDataUrl = reader.result;
          await updateUserProfilePhoto(user.uid, photoDataUrl);
          if (onUpdateUserPhoto) {
            onUpdateUserPhoto(photoDataUrl);
          }
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error updating profile picture:', err);
      setPhotoError('ছবি আপলোড করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      setIsUploadingPhoto(false);
    }
  };

  // Handle Saving User Profile Details
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingInfo(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // Handle Soft Account Deletion (7-Day Grace Period)
  const handleConfirmSoftDeleteAccount = async () => {
    if (!user) return;
    
    // Require user to type "DELETE" or their phone/password confirmation
    if (!deleteConfirmationInput.trim()) {
      setDeleteAccountError('নিশ্চিত করতে অনুগ্রহ করে "DELETE" অথবা পাসওয়ার্ড লিখুন');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError('');

    try {
      await scheduleAccountDeletion(user.uid);
      setIsDeleteAccountModalOpen(false);
      onLogoutSuccess();
      alert('আপনার অ্যাকাউন্টটি মুছে ফেলার জন্য ৭ দিনের শিডিউল গ্রহণ করা হয়েছে। আগামী ৭ দিনের মধ্যে পুনরায় লগইন করলে আপনার অ্যাকাউন্টটি স্বয়ংক্রিয়ভাবে পুনরুদ্ধার ও সচল হবে।');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setDeleteAccountError('অ্যাকাউন্ট ডিলিট শিডিউল করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setIsDeletingAccount(false);
    }
  };

  // Format Taka
  const formatTaka = (amount: number) => {
    return `৳ ${amount.toLocaleString('en-US')}`;
  };

  // If user is logged out, show the login prompt (NO ADMIN LINK)
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 mb-24 sm:mb-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto border border-orange-200 shadow-md shadow-orange-100">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0A1128]">মাই প্রোফাইলে স্বাগতম</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              আপনার বিজ্ঞাপন পরিচালনা, পছন্দের তালিকা দেখা ও প্রোফাইল ব্যবস্থাপনা করতে এখনই লগইন বা রেজিস্ট্রেশন করুন।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              id="btn-profile-login-prompt"
              className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white text-sm font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-orange-200/80 transition active:scale-[0.99] cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন / সাইন আপ করুন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeAdsCount = myAds.filter(a => a.status === 'active' || !a.status).length;
  const pendingAdsCount = myAds.filter(a => a.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 mb-24 sm:mb-16 overflow-x-hidden">
      
      {/* Top Global Language Switcher */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-3 sm:p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#FF6600]" />
          <span className="text-xs sm:text-sm font-bold text-[#0A1128]">
            {language === 'bn' ? 'ভাষা নির্বাচন (Language)' : 'Language Selection'}
          </span>
        </div>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setLanguage('bn')}
            id="btn-lang-bn"
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              language === 'bn' ? 'bg-[#0A1128] text-white shadow-xs' : 'text-gray-600 hover:text-[#0A1128]'
            }`}
          >
            বাংলা
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            id="btn-lang-en"
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              language === 'en' ? 'bg-[#FF6600] text-white shadow-xs' : 'text-gray-600 hover:text-[#0A1128]'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Hidden File Input for Profile Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/*"
        className="hidden"
        id="profile-photo-upload-input"
      />


      {/* Main User Dashboard Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-7 mb-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          
          {/* Avatar with Camera Overlay Trigger */}
          <div className="relative group shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-lg border-3 border-[#FF6600]/40 ring-4 ring-orange-50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#0A1128] text-white flex items-center justify-center font-black text-3xl shadow-lg border-3 border-[#FF6600]/40 ring-4 ring-orange-50">
                <span className="text-[#FF6600]">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Profile Photo Change Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              id="btn-upload-profile-photo"
              title="প্রোফাইল ছবি পরিবর্তন করুন"
              className="absolute -bottom-2 -right-2 bg-[#FF6600] hover:bg-[#e65c00] active:scale-95 text-white p-2.5 rounded-2xl shadow-md border-2 border-white transition cursor-pointer flex items-center justify-center"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Details & Status */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#0A1128] truncate">
                  {user.displayName || 'সম্মানিত ব্যবহারকারী'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> ভেরিফাইড
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-600 mb-3 space-y-1">
              {user.phoneNumber && (
                <p className="flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-[#FF6600]" />
                  <span>{user.phoneNumber}</span>
                </p>
              )}
              {user.email && (
                <p className="flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#FF6600]" />
                  <span>{user.email}</span>
                </p>
              )}
              <p className="text-[11px] text-gray-400 flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>BechoKino.com সদস্য • ক্লাউড প্রোফাইল</span>
              </p>
            </div>

            {photoError && (
              <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-xl border border-red-200">
                {photoError}
              </p>
            )}

            {savedNotice && (
              <p className="text-xs text-emerald-700 mb-3 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> প্রোফাইল তথ্য সফলভাবে সেভ হয়েছে!
              </p>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <div 
                onClick={() => setActiveSection('my_ads')}
                className="bg-slate-50 hover:bg-orange-50/50 p-2 rounded-xl text-center border border-gray-200/70 cursor-pointer transition"
              >
                <span className="block text-base font-black text-[#0A1128]">{myAdsCount}</span>
                <span className="text-[10px] text-gray-500 font-medium">মোট বিজ্ঞাপন</span>
              </div>
              <div 
                onClick={() => setActiveSection('my_ads')}
                className="bg-slate-50 hover:bg-orange-50/50 p-2 rounded-xl text-center border border-gray-200/70 cursor-pointer transition"
              >
                <span className="block text-base font-black text-amber-600">{pendingAdsCount}</span>
                <span className="text-[10px] text-gray-500 font-medium">In Review</span>
              </div>
              <div 
                onClick={() => setActiveSection('saved')}
                className="bg-slate-50 hover:bg-orange-50/50 p-2 rounded-xl text-center border border-gray-200/70 cursor-pointer transition"
              >
                <span className="block text-base font-black text-red-500">{favoriteAds.length}</span>
                <span className="text-[10px] text-gray-500 font-medium">সংরক্ষিত</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* MOBILE APP STYLE NAVIGATION (STRICTLY NO HORIZONTAL SCROLL - 2-COLUMN BUTTON GRID & VERTICAL CARDS) */}
      {activeSection !== 'overview' && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FF6600]" />
            <span>মূল মেনুতে ফিরে যান</span>
          </button>
        </div>
      )}

      {/* 2x2 Clean Navigation Grid (Mobile App Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <button
          type="button"
          onClick={() => setActiveSection('details')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
            activeSection === 'details'
              ? 'bg-[#0A1128] text-white border-[#0A1128]'
              : 'bg-white text-gray-800 border-gray-200 hover:border-[#FF6600]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeSection === 'details' ? 'bg-[#FF6600] text-white' : 'bg-orange-50 text-[#FF6600]'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </div>
          <div>
            <span className="block text-xs font-black">আমার তথ্য</span>
            <span className="text-[10px] opacity-70">ব্যক্তিগত প্রোফাইল</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('my_ads')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
            activeSection === 'my_ads'
              ? 'bg-[#0A1128] text-white border-[#0A1128]'
              : 'bg-white text-gray-800 border-gray-200 hover:border-[#FF6600]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeSection === 'my_ads' ? 'bg-[#FF6600] text-white' : 'bg-orange-50 text-[#FF6600]'
            }`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeSection === 'my_ads' ? 'bg-orange-500/30 text-white' : 'bg-orange-100 text-[#FF6600]'
            }`}>
              {myAdsCount}
            </span>
          </div>
          <div>
            <span className="block text-xs font-black">আমার বিজ্ঞাপন</span>
            <span className="text-[10px] opacity-70">পোস্টসমূহ পরিচালনা</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('saved')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
            activeSection === 'saved'
              ? 'bg-[#0A1128] text-white border-[#0A1128]'
              : 'bg-white text-gray-800 border-gray-200 hover:border-[#FF6600]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeSection === 'saved' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'
            }`}>
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeSection === 'saved' ? 'bg-red-500/30 text-white' : 'bg-red-100 text-red-600'
            }`}>
              {favoriteAds.length}
            </span>
          </div>
          <div>
            <span className="block text-xs font-black">পছন্দের তালিকা</span>
            <span className="text-[10px] opacity-70">সংরক্ষিত বিজ্ঞাপন</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('settings')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
            activeSection === 'settings'
              ? 'bg-[#0A1128] text-white border-[#0A1128]'
              : 'bg-white text-gray-800 border-gray-200 hover:border-[#FF6600]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              activeSection === 'settings' ? 'bg-[#FF6600] text-white' : 'bg-slate-100 text-gray-700'
            }`}>
              <Settings className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </div>
          <div>
            <span className="block text-xs font-black">সেটিংস ও সাপোর্ট</span>
            <span className="text-[10px] opacity-70">হেল্পলাইন ও নিরাপত্তা</span>
          </div>
        </button>
      </div>

      {/* OVERVIEW / DASHBOARD SUMMARY */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setActiveSection('my_ads')}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-[#FF6600] transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6600] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0A1128]">আমার বিজ্ঞাপনসমূহ ({myAdsCount})</h3>
                  <p className="text-[11px] text-gray-500">বিজ্ঞাপন এডিট, ডিলিট ও রিভিউ স্ট্যাটাস দেখুন</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6600] transition" />
            </div>

            <div
              onClick={onOpenPostAd}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-500 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0A1128]">নতুন বিজ্ঞাপন দিন</h3>
                  <p className="text-[11px] text-gray-500">দ্রুত পণ্য বিক্রির জন্য পোস্ট করুন</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition" />
            </div>
          </div>

          {/* Customer Support WhatsApp Banner (Ref: 0010.jpg FIX) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs">
            <h3 className="text-xs font-black text-[#0A1128] uppercase tracking-wider mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#FF6600]" />
              <span>২৪/৭ গ্রাহক সহায়তা ও হটলাইন</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-gray-500 block text-xs mb-0.5">২৪/৭ কাস্টমার WhatsApp সাপোর্ট:</span>
                <span className="text-sm font-black text-[#0A1128]">
                  {settings?.whatsappNumber || '+971 54 552 2436'}
                </span>
              </div>
              <a 
                href={settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}` : 'https://wa.me/971545522436'} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Prominent Direct Logout on Profile 1st Page */}
          <div className="bg-white rounded-3xl border border-red-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-[#0A1128]">লগআউট করুন (Logout)</h4>
                <p className="text-[11px] text-gray-500">আপনার বর্তমান ডিভাইস ও ব্রাউজার সেশন থেকে নিরাপদে সাইন আউট করুন</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              id="btn-profile-overview-logout"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট করুন</span>
            </button>
          </div>

        </div>
      )}

      {/* SECTION 1: MY DETAILS (আমার তথ্য) */}
      {activeSection === 'details' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF6600]" />
                <span>ব্যক্তিগত তথ্য (Personal Details)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                className="text-xs font-bold text-[#FF6600] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingInfo ? 'বাতিল করুন' : 'তথ্য পরিবর্তন করুন'}</span>
              </button>
            </div>

            {isEditingInfo ? (
              <form onSubmit={handleSaveInfo} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">আপনার পূর্ণ নাম</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/30 focus:border-[#FF6600]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder=""
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/30 focus:border-[#FF6600]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#FF6600] hover:bg-[#e65c00] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>সেভ করুন</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-gray-500 block mb-1">নাম:</span>
                  <span className="text-sm font-bold text-[#0A1128]">{user.displayName || 'নাম দেওয়া হয়নি'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-gray-500 block mb-1">মোবাইল নম্বর:</span>
                  <span className="text-sm font-bold text-[#0A1128]">{user.phoneNumber || 'ফোন নম্বর নেই'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-gray-500 block mb-1">ইমেইল অ্যাড্রেস:</span>
                  <span className="text-sm font-bold text-[#0A1128]">{user.email || 'ইমেইল নেই'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-gray-500 block mb-1">অ্যাকাউন্ট স্ট্যাটাস:</span>
                  <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> সক্রিয় কাস্টমার প্রোফাইল (Active)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MY ADS (আমার বিজ্ঞাপন) */}
      {activeSection === 'my_ads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FF6600]" />
              <span>আমার সব বিজ্ঞাপন ({myAds.length})</span>
            </h2>
          </div>

          {myAds.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-[#0A1128]">এখনও কোনো বিজ্ঞাপন পোস্ট করেননি</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                আপনার অব্যবহৃত পণ্য দ্রুত বিক্রি করতে আজই BechoKino.com-এ বিজ্ঞাপন দিন।
              </p>
              <button
                type="button"
                onClick={onOpenPostAd}
                className="bg-[#FF6600] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition hover:bg-[#e65c00] cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>প্রথম বিজ্ঞাপন পোস্ট করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myAds.map((ad) => {
                const isPending = ad.status === 'pending';
                const isRejected = ad.status === 'rejected';

                return (
                  <div 
                    key={ad.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    {/* Thumbnail & Title */}
                    <div 
                      onClick={() => onSelectAd(ad)}
                      className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                    >
                      <img
                        src={ad.images?.[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80'}
                        alt={ad.title}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#0A1128] truncate hover:text-[#FF6600] transition">
                            {ad.title}
                          </h3>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md animate-pulse">
                              <Clock className="w-3 h-3" /> ⏳ In Review (যাচাইকরণ চলছে)
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 border border-red-300 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3" /> বাতিল (Rejected)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> লাইভ (Active)
                            </span>
                          )}

                          <span className="text-[11px] text-gray-500 font-medium">
                            {ad.category} • {ad.district}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#FF6600]">
                            {formatTaka(ad.price)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {ad.isNegotiable ? '(আলোচনা সাপেক্ষ)' : '(ফিক্সড প্রাইস)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <button
                        type="button"
                        onClick={() => onSelectAd(ad)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center gap-1 cursor-pointer"
                        title="বিজ্ঞাপন দেখুন"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">দেখুন</span>
                      </button>

                      {onEditAd && (
                        <button
                          type="button"
                          onClick={() => onEditAd(ad)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                          title="বিজ্ঞাপন এডিট করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>এডিট করুন</span>
                        </button>
                      )}

                      {onDeleteAd && (
                        <button
                          type="button"
                          onClick={() => setAdToDelete(ad)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 cursor-pointer"
                          title="বিজ্ঞাপন ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ডিলিট করুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: SAVED ADS (সংরক্ষিত বিজ্ঞাপন) */}
      {activeSection === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-red-500 fill-red-500" />
              <span>সংরক্ষিত পছন্দের বিজ্ঞাপনসমূহ ({favoriteAds.length})</span>
            </h2>
          </div>

          {favoriteAds.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-xs text-gray-500 space-y-2">
              <Heart className="w-8 h-8 text-gray-300 mx-auto" />
              <p>আপনার পছন্দের তালিকায় কোনো বিজ্ঞাপন যোগ করা নেই।</p>
              <p className="text-[11px] text-gray-400">হোমপেজে গিয়ে যেকোনো বিজ্ঞাপনের হার্ট আইকনে ক্লিক করে ফেভারিট সেভ করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {favoriteAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onClick={() => onSelectAd(ad)}
                  isFavorite={true}
                  onToggleFavorite={() => onToggleFavorite(ad.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: ACCOUNT SETTINGS & SUPPORT (NO ADMIN LINK) */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          {/* Customer Support WhatsApp Banner (Ref: 0010.jpg FIX) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-black text-[#0A1128] mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#FF6600]" />
              <span>২৪/৭ কাস্টমার WhatsApp সাপোর্ট</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-gray-500 block text-xs mb-0.5">অফিশিয়াল সাপোর্ট নম্বর:</span>
                <span className="text-sm font-black text-[#0A1128]">
                  {settings?.whatsappNumber || '+971 54 552 2436'}
                </span>
              </div>
              <a 
                href={settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}` : 'https://wa.me/971545522436'} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp এ মেসেজ দিন</span>
              </a>
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0A1128]">লগআউট (Logout)</h4>
                <p className="text-[11px] text-gray-500">বর্তমান ব্রাউজার সেশন থেকে সাইন আউট করুন</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              id="btn-profile-logout"
              className="bg-[#0A1128] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              লগআউট
            </button>
          </div>

          {/* 1-Week Soft Account Deletion Card */}
          <div className="bg-red-50/50 rounded-3xl border border-red-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-red-700">অ্যাকাউন্ট ডিলিট করুন (Delete Account)</h4>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                  আপনার অ্যাকাউন্ট ডিলিটের আবেদন ৭ দিনের জন্য শিডিউল থাকবে। ৭ দিনের মধ্যে পুনরায় লগইন করলে অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে ফিরে পাবেন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeleteConfirmationInput('');
                setDeleteAccountError('');
                setIsDeleteAccountModalOpen(true);
              }}
              id="btn-delete-account-trigger"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              অ্যাকাউন্ট ডিলিট
            </button>
          </div>

        </div>
      )}

      {/* Soft Account Deletion Confirmation Modal (1-Week Grace Period) */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-[#0A1128] text-base sm:text-lg">
                আপনি কি অ্যাকাউন্ট ডিলিট করতে চান?
              </h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                আপনার অ্যাকাউন্টটি তাৎক্ষণিকভাবে মুছে যাবে না। আগামী <b>৭ দিন</b> পর্যন্ত এটি পেন্ডিং অবস্থায় থাকবে। আপনি ৭ দিনের ভেতর যেকোনো সময় পুনরায় লগইন করলেই আপনার সব তথ্য ও বিজ্ঞাপন স্বয়ংক্রিয়ভাবে ফিরে পাবেন।
              </p>
            </div>

            {deleteAccountError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteAccountError}</span>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-gray-700">
                নিশ্চিত করতে নিচে <b>DELETE</b> অথবা আপনার পাসওয়ার্ড লিখুন:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="DELETE লিখুন"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs text-[#0A1128] focus:bg-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountModalOpen(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>ডিলিট শিডিউল নিশ্চিত করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Ad Confirmation Modal */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-black text-[#0A1128] text-base">বিজ্ঞাপন ডিলিট করবেন?</h3>
              <p className="text-xs text-gray-500 mt-1">
                "{adToDelete.title}" স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAd && adToDelete) {
                    onDeleteAd(adToDelete.id);
                    setAdToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
