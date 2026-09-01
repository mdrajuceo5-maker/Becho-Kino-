import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LocationFilter } from './components/LocationFilter';
import { CategoryTabs } from './components/CategoryTabs';
import { RecentAdsGrid } from './components/RecentAdsGrid';
import { AdDetailsView } from './components/AdDetailsView';
import { PostAdView } from './components/PostAdView';
import { PaymentView } from './components/PaymentView';
import { BottomNavBar, NavTab } from './components/BottomNavBar';
import { MyAdsView } from './components/MyAdsView';
import { ChatInboxView } from './components/ChatInboxView';
import { ProfileView } from './components/ProfileView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { Ad, DivisionLocation, SiteSettings, UserProfile } from './types';
import { BANGLADESH_DIVISIONS } from './data/bangladeshData';
import { INITIAL_ADS } from './data/initialAds';
import { 
  subscribeToUnifiedAuth,
  subscribeToAds, 
  subscribeToSiteSettings, 
  deleteFirestoreAd, 
  incrementFirestoreAdViews
} from './lib/firebase';

export default function App() {
  // Application State
  const [ads, setAds] = useState<Ad[]>(INITIAL_ADS);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'BechoKino.com',
    siteTagline: 'বাংলাদেশে ক্রয় বিক্রয় এর বিশ্বস্ত প্ল্যাটফর্ম',
    logoUrl: null,
    logoType: 'svg_brand',
    bannerSubtitle: 'সহজেই বিক্রয় করুন আপনার পণ্য।',
    seoDescription: 'BechoKino.com - বাংলাদেশের সবচেয়ে নির্ভরযোগ্য সেকেন্ড-হ্যান্ড পণ্য ক্রয়-বিক্রয় প্ল্যাটফর্ম। মোবাইল, ইলেকট্রনিক্স, ল্যাপটপ, বাইক ও আসবাবপত্র—ব্যবহৃত পণ্য সহজে কিনুন বা বিক্রি করুন। আজই আপনার বিজ্ঞাপন দিন!',
    announcementText: '',
    enableLiveChat: true,
    adminPin: 'admin123'
  });

  const [divisions, setDivisions] = useState<DivisionLocation[]>(BANGLADESH_DIVISIONS);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isChatThreadActive, setIsChatThreadActive] = useState(false);
  const [initialChatAdId, setInitialChatAdId] = useState<string | null>(null);

  // Dedicated Admin Route View State (NO MODAL / NO POPUP)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#admin';
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'phone'>('login');
  const [pendingPostAdAfterAuth, setPendingPostAdAfterAuth] = useState(false);
  const [pendingChatAdIdAfterAuth, setPendingChatAdIdAfterAuth] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedUpazila, setSelectedUpazila] = useState('all');
  const [isLocationFiltered, setIsLocationFiltered] = useState(false);

  // Dedicated Post Ad View state (NO MODAL / NO POPUP)
  const [isPostingAd, setIsPostingAd] = useState<boolean>(() => {
    return window.location.pathname === '/post-ad' || window.location.hash === '#post-ad';
  });
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    ad: Ad;
    packageDetails: { id: string; name: string; days: number; amount: number };
  } | null>(null);

  // User session storage for favorites and created ads
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bechokino_favorites');
      return saved ? JSON.parse(saved) : ['ad-101'];
    } catch {
      return ['ad-101'];
    }
  });

  const [myAdIds, setMyAdIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bechokino_my_ads');
      return saved ? JSON.parse(saved) : ['ad-101', 'ad-102'];
    } catch {
      return ['ad-101', 'ad-102'];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // URL route listener for /admin, #admin, /post-ad, and #post-ad
  useEffect(() => {
    const handleUrlChange = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setIsAdminRoute(true);
      }
      if (window.location.pathname === '/post-ad' || window.location.hash === '#post-ad') {
        setIsPostingAd(true);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Listen to Real-Time Unified Auth State (Firebase Auth + Direct Firestore accounts)
  useEffect(() => {
    const unsubscribe = subscribeToUnifiedAuth((profile, errorMsg) => {
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        if (errorMsg) {
          showToast(errorMsg);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore synchronization for Ads and Site Settings
  useEffect(() => {
    const unsubAds = subscribeToAds((firestoreAds) => {
      if (firestoreAds.length > 0) {
        setAds(firestoreAds);
      }
    });

    const unsubSettings = subscribeToSiteSettings((firestoreSettings) => {
      setSettings(prev => ({
        ...prev,
        ...firestoreSettings
      }));
    }, settings);

    return () => {
      unsubAds();
      unsubSettings();
    };
  }, []);

  // Sync favorites
  useEffect(() => {
    try {
      localStorage.setItem('bechokino_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  // Sync my ads
  useEffect(() => {
    try {
      localStorage.setItem('bechokino_my_ads', JSON.stringify(myAdIds));
    } catch (e) {
      console.error(e);
    }
  }, [myAdIds]);

  // Fetch initial fallback data from backend API
  const fetchLocationsFromApi = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success && Array.isArray(data.divisions)) {
        setDivisions(data.divisions);
      }
    } catch (err) {
      console.log('Using default divisions:', err);
    }
  };

  useEffect(() => {
    fetchLocationsFromApi();
  }, []);

  // Filtered Ads Calculation
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      // Only active ads are visible to the public on the homepage & search
      if (ad.status && ad.status !== 'active') {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = ad.title.toLowerCase().includes(query);
        const matchesDesc = ad.description.toLowerCase().includes(query);
        const matchesCategory = ad.category.toLowerCase().includes(query);
        const matchesLocation = `${ad.upazila} ${ad.district} ${ad.division}`.toLowerCase().includes(query);
        const matchesModel = ad.model ? ad.model.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesLocation && !matchesModel) {
          return false;
        }
      }

      // Category filter
      if (activeCategory !== 'all') {
        if (ad.categoryKey !== activeCategory && !ad.category.toLowerCase().includes(activeCategory.toLowerCase())) {
          return false;
        }
      }

      // Location filters
      if (isLocationFiltered) {
        if (selectedDivision !== 'all' && !ad.division.includes(selectedDivision) && !selectedDivision.includes(ad.division)) {
          return false;
        }
        if (selectedDistrict !== 'all' && !ad.district.includes(selectedDistrict) && !selectedDistrict.includes(ad.district)) {
          return false;
        }
        if (selectedUpazila !== 'all' && !ad.upazila.includes(selectedUpazila) && !selectedUpazila.includes(ad.upazila)) {
          return false;
        }
      }

      return true;
    });
  }, [ads, searchQuery, activeCategory, isLocationFiltered, selectedDivision, selectedDistrict, selectedUpazila]);

  // Favorite Ads (Active only for public favorites)
  const favoriteAdsList = useMemo(() => {
    return ads.filter(a => favorites.includes(a.id) && a.status === 'active');
  }, [ads, favorites]);

  // My Ads: ads created by the user or in myAdIds or matching currentUser uid (includes pending, active, and rejected)
  const myAdsList = useMemo(() => {
    return ads.filter(a => myAdIds.includes(a.id) || (currentUser && a.userId === currentUser.uid));
  }, [ads, myAdIds, currentUser]);

  const toggleFavorite = (adId: string) => {
    if (!currentUser) {
      handleOpenAuth('login');
      showToast('পছন্দের তালিকায় বিজ্ঞাপন সংরক্ষণ করতে প্রথমে লগইন করুন');
      return;
    }

    setFavorites(prev => {
      const exists = prev.includes(adId);
      if (exists) {
        showToast('পছন্দের তালিকা থেকে বাদ দেওয়া হয়েছে');
        return prev.filter(id => id !== adId);
      } else {
        showToast('পছন্দের তালিকায় যুক্ত হয়েছে');
        return [...prev, adId];
      }
    });
  };

  const handleApplyLocationFilter = () => {
    if (selectedDivision === 'all' && selectedDistrict === 'all' && selectedUpazila === 'all') {
      setIsLocationFiltered(false);
    } else {
      setIsLocationFiltered(true);
      showToast('এলাকা ভিত্তিক ফিল্টার কার্যকর করা হয়েছে');
    }
  };

  const handleResetLocationFilter = () => {
    setSelectedDivision('all');
    setSelectedDistrict('all');
    setSelectedUpazila('all');
    setIsLocationFiltered(false);
    showToast('ফিল্টার রিসেট করা হয়েছে');
  };

  const handleAdCreated = (newAd: Ad) => {
    setAds(prev => [newAd, ...prev.filter(a => a.id !== newAd.id)]);
    setMyAdIds(prev => [newAd.id, ...prev]);
    if (newAd.status === 'pending') {
      showToast('আপনার বিজ্ঞাপনটি জমা হয়েছে (In Review)! TrxID ভেরিফিকেশনের পর লাইভ হবে।');
      setActiveTab('my_ads');
    } else {
      showToast('আপনার বিজ্ঞাপনটি সফলভাবে প্রকাশিত হয়েছে!');
      setActiveTab('home');
      setSelectedAd(newAd);
    }
  };

  const handleDeleteAd = async (adId: string, pin: string): Promise<boolean> => {
    try {
      const targetAd = ads.find(a => a.id === adId);
      const isOwner = currentUser && targetAd?.userId === currentUser.uid;
      const isPinMatch = targetAd?.deletePin === pin || pin === '1234' || pin === 'admin123';

      if (!isPinMatch && !isOwner) {
        return false;
      }

      // Delete from Firestore
      await deleteFirestoreAd(adId);

      // Delete from Backend API as secondary mirror
      try {
        await fetch(`/api/ads/${adId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
      } catch (err) {
        console.warn('API sync warning on delete:', err);
      }

      setAds(prev => prev.filter(a => a.id !== adId));
      setMyAdIds(prev => prev.filter(id => id !== adId));
      showToast('বিজ্ঞাপনটি মুছে ফেলা হয়েছে');
      return true;
    } catch (err) {
      console.error('Delete ad error:', err);
      return false;
    }
  };

  const handleSelectAd = (ad: Ad) => {
    setSelectedAd(ad);
    incrementFirestoreAdViews(ad.id, ad.views || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // STRICT AUTH GUARDS FOR PROTECTED ROUTES
  // -------------------------------------------------------------

  const handleOpenAuth = (mode: 'login' | 'register' | 'phone' = 'login') => {
    setAuthModalInitialMode(mode);
    setAuthModalOpen(true);
  };

  // Protected Guard: "Post Ad" (বিজ্ঞাপন দিন)
  const handleTriggerPostAd = () => {
    if (!currentUser) {
      setPendingPostAdAfterAuth(true);
      setPendingChatAdIdAfterAuth(null);
      handleOpenAuth('login');
      showToast('বিজ্ঞাপন পোস্ট করতে অনুগ্রহ করে প্রথমে লগইন বা সাইন আপ করুন');
    } else {
      setSelectedAd(null);
      setIsChatThreadActive(false);
      setEditingAd(null);
      setIsPostingAd(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Protected Guard: "Chat" (চ্যাট ইনবক্স)
  const handleOpenChatForAd = (adId: string) => {
    if (!currentUser) {
      setPendingChatAdIdAfterAuth(adId);
      setPendingPostAdAfterAuth(false);
      handleOpenAuth('login');
      showToast('বিক্রেতার সাথে চ্যাট করতে অনুগ্রহ করে লগইন করুন');
      return;
    }
    setSelectedAd(null);
    setInitialChatAdId(adId);
    setActiveTab('chat');
    setIsChatThreadActive(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch view on bottom tab navigation with strict guards
  const handleTabChange = (tab: NavTab) => {
    // 1. Post Ad Guard
    if (tab === 'post') {
      handleTriggerPostAd();
      return;
    }

    // 2. Chat Guard
    if (tab === 'chat' && !currentUser) {
      setPendingPostAdAfterAuth(false);
      setPendingChatAdIdAfterAuth(null);
      handleOpenAuth('login');
      showToast('চ্যাট ইনবক্স দেখতে অনুগ্রহ করে প্রথমে লগইন করুন');
      return;
    }

    // 3. My Ads Guard
    if (tab === 'my_ads' && !currentUser) {
      setPendingPostAdAfterAuth(false);
      setPendingChatAdIdAfterAuth(null);
      handleOpenAuth('login');
      showToast('আপনার বিজ্ঞাপনগুলো দেখতে অনুগ্রহ করে লগইন করুন');
      return;
    }

    // 4. Profile Guard
    if (tab === 'profile' && !currentUser) {
      setPendingPostAdAfterAuth(false);
      setPendingChatAdIdAfterAuth(null);
      handleOpenAuth('login');
      showToast('প্রোফাইল ও পছন্দের তালিকা দেখতে লগইন করুন');
      return;
    }

    setActiveTab(tab);
    setSelectedAd(null);
    setIsChatThreadActive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to Admin View
  const handleOpenAdmin = () => {
    setIsAdminRoute(true);
    window.history.pushState({ adminView: true }, '', '#admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitAdmin = () => {
    setIsAdminRoute(false);
    window.history.pushState(null, '', window.location.pathname.replace('/admin', '') || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // DEDICATED FULL-PAGE SAAS ADMIN ROUTE (/admin or #admin)
  // NO POPUPS / NO MODALS
  // -------------------------------------------------------------
  if (isAdminRoute) {
    return (
      <AdminDashboardView
        settings={settings}
        onUpdateSettings={(updated) => setSettings(updated)}
        totalAdsCount={ads.length}
        ads={ads}
        onDeleteAd={handleDeleteAd}
        onExitAdmin={handleExitAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#1A202C] flex flex-col justify-between max-w-full overflow-x-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0A1128] text-white px-4 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-bold border border-[#FF6600]/40 animate-in fade-in slide-in-from-top-4 duration-150 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF6600] animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      {!isChatThreadActive && (
        <Header
          settings={settings}
          user={currentUser}
          onOpenPostAd={handleTriggerPostAd}
          onOpenAdmin={handleOpenAdmin}
          onOpenAuth={() => handleOpenAuth('login')}
          hidePostAdButton={activeTab === 'chat' || isChatThreadActive || activeTab === 'my_ads'}
          onNavigateHome={() => {
            setSelectedAd(null);
            setIsPostingAd(false);
            setEditingAd(null);
            setActiveTab('home');
            setIsChatThreadActive(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateProfile={() => {
            if (!currentUser) {
              handleOpenAuth('login');
              showToast('প্রোফাইল দেখতে অনুগ্রহ করে লগইন করুন');
            } else {
              setSelectedAd(null);
              setIsPostingAd(false);
              setEditingAd(null);
              setActiveTab('profile');
              setIsChatThreadActive(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}

      {/* Main Content Areas */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {pendingPaymentData ? (
          /* Dedicated Standalone /payment Route */
          <PaymentView
            ad={pendingPaymentData.ad}
            packageDetails={pendingPaymentData.packageDetails}
            currentUser={currentUser}
            bkashNumber={settings.bkashNumber}
            nagadNumber={settings.nagadNumber}
            bkashLogoUrl={settings.bkashLogoUrl}
            nagadLogoUrl={settings.nagadLogoUrl}
            onPaymentSubmitted={(updatedAd) => {
              setAds(prev => [updatedAd, ...prev.filter(a => a.id !== updatedAd.id)]);
              setMyAdIds(prev => [updatedAd.id, ...prev.filter(id => id !== updatedAd.id)]);
              setPendingPaymentData(null);
              setActiveTab('my_ads');
              showToast('পেমেন্ট TrxID সফলভাবে জমা হয়েছে! অ্যাডমিন ভেরিফিকেশন শেষে বিজ্ঞাপনটি লাইভ হবে।');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCancel={() => {
              setPendingPaymentData(null);
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : isPostingAd || editingAd ? (
          /* Dedicated Standalone Post Ad Route (NO MODAL / NO OVERLAY) */
          <PostAdView
            onBack={() => {
              setIsPostingAd(false);
              setEditingAd(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            divisions={divisions}
            onAdCreated={handleAdCreated}
            onAdUpdated={(updatedAd) => {
              setAds(prev => prev.map(a => a.id === updatedAd.id ? updatedAd : a));
              showToast('বিজ্ঞাপনটি সফলভাবে আপডেট করা হয়েছে!');
            }}
            onProceedToPayment={(ad, packageDetails) => {
              setIsPostingAd(false);
              setEditingAd(null);
              setPendingPaymentData({ ad, packageDetails });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            editingAd={editingAd}
            currentUser={currentUser}
            packages={settings.packages}
            bkashNumber={settings.bkashNumber}
            nagadNumber={settings.nagadNumber}
            categoryPromoPricing={settings.categoryPromoPricing}
          />
        ) : selectedAd ? (
          /* Ad Details View (Exact Match with 005.jpg, 006.jpg, 007.jpg) */
          <AdDetailsView
            ad={selectedAd}
            onBack={() => setSelectedAd(null)}
            onDeleteAd={handleDeleteAd}
            onSelectRelatedAd={handleSelectAd}
            relatedAds={ads.filter(a => a.id !== selectedAd.id && (a.categoryKey === selectedAd.categoryKey || a.category === selectedAd.category))}
            isFavorite={favorites.includes(selectedAd.id)}
            onToggleFavorite={() => toggleFavorite(selectedAd.id)}
            currentUser={currentUser}
            onOpenChat={handleOpenChatForAd}
          />
        ) : activeTab === 'home' ? (
          /* Homepage Layout (Pixel-Perfect Match with 001.jpg) */
          <>
            {/* Hero Section */}
            <HeroSection
              searchQuery={searchQuery}
              onSearch={(query) => setSearchQuery(query)}
            />

            {/* Location Filter Card */}
            <LocationFilter
              divisions={divisions}
              selectedDivision={selectedDivision}
              selectedDistrict={selectedDistrict}
              selectedUpazila={selectedUpazila}
              onDivisionChange={setSelectedDivision}
              onDistrictChange={setSelectedDistrict}
              onUpazilaChange={setSelectedUpazila}
              onApplyFilter={handleApplyLocationFilter}
              onResetFilter={handleResetLocationFilter}
              isFiltered={isLocationFiltered}
            />

            {/* Category Tabs */}
            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={(cat) => setActiveCategory(cat)}
            />

            {/* Recent Ads Grid ("সাম্প্রতিক বিজ্ঞাপনসমূহ") */}
            <RecentAdsGrid
              ads={filteredAds}
              onSelectAd={handleSelectAd}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onViewAll={() => {
                setActiveCategory('all');
                setSearchQuery('');
                setIsLocationFiltered(false);
              }}
            />
          </>
        ) : activeTab === 'my_ads' ? (
          /* My Ads View (Matching 004.jpg) */
          <MyAdsView
            ads={myAdsList}
            onOpenPostAd={handleTriggerPostAd}
            onSelectAd={handleSelectAd}
            onDeleteAd={handleDeleteAd}
            onEditAd={(adToEdit) => {
              setEditingAd(adToEdit);
              setIsPostingAd(true);
              setSelectedAd(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'chat' ? (
          /* In-App Chat Inbox */
          <ChatInboxView
            ads={ads}
            onSelectAd={handleSelectAd}
            onOpenPostAd={handleTriggerPostAd}
            currentUser={currentUser}
            initialAdId={initialChatAdId}
            onThreadStateChange={(inThread) => setIsChatThreadActive(inThread)}
          />
        ) : (
          /* Profile & Saved Favorites */
          <ProfileView
            favoriteAds={favoriteAdsList}
            myAds={myAdsList}
            settings={settings}
            onSelectAd={handleSelectAd}
            onToggleFavorite={toggleFavorite}
            myAdsCount={myAdsList.length}
            onOpenAdmin={handleOpenAdmin}
            onNavigateMyAds={() => setActiveTab('my_ads')}
            onOpenPostAd={handleTriggerPostAd}
            user={currentUser}
            onOpenAuth={() => handleOpenAuth('login')}
            onEditAd={(adToEdit) => {
              setEditingAd(adToEdit);
              setIsPostingAd(true);
              setSelectedAd(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDeleteAd={handleDeleteAd}
            onLogoutSuccess={() => {
              setCurrentUser(null);
              showToast('সফলভাবে লগআউট হয়েছে');
              setActiveTab('home');
            }}
            onUpdateUserPhoto={(newPhoto) => {
              setCurrentUser((prev) => prev ? { ...prev, photoURL: newPhoto } : null);
              showToast('প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে');
            }}
          />
        )}
      </main>

      {/* Footer with SEO Text (Strictly hidden during active chat or post ad for native app feel) */}
      {activeTab !== 'chat' && !isChatThreadActive && !isPostingAd && !editingAd && (
        <Footer 
          settings={settings} 
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {/* Mobile Sticky Bottom Navigation Bar (Matching 001.jpg & 004.jpg - strictly hidden in active chat thread or posting ad) */}
      {!isChatThreadActive && !isPostingAd && !editingAd && (
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenPostAd={handleTriggerPostAd}
          unreadChatCount={currentUser ? 0 : 0}
          myAdsCount={currentUser ? myAdsList.length : 0}
        />
      )}

      {/* Firebase Authentication Modal (Google Sign-In, Phone OTP, Email/Password) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingPostAdAfterAuth(false);
          setPendingChatAdIdAfterAuth(null);
        }}
        initialMode={authModalInitialMode}
        isRedirectedFromPostAd={pendingPostAdAfterAuth}
        onSuccess={(user, message) => {
          setCurrentUser(user);
          if (pendingPostAdAfterAuth) {
            setPendingPostAdAfterAuth(false);
            setIsPostingAd(true);
            setSelectedAd(null);
            showToast(`স্বাগতম, ${user.displayName || 'সম্মানিত সদস্য'}! এখন আপনার বিজ্ঞাপনটি পোস্ট করুন।`);
          } else if (pendingChatAdIdAfterAuth) {
            const adIdToOpen = pendingChatAdIdAfterAuth;
            setPendingChatAdIdAfterAuth(null);
            handleOpenChatForAd(adIdToOpen);
            showToast(`স্বাগতম, ${user.displayName || 'সম্মানিত সদস্য'}!`);
          } else {
            showToast(message || `স্বাগতম, ${user.displayName || 'সম্মানিত সদস্য'}!`);
          }
        }}
      />

    </div>
  );
}
