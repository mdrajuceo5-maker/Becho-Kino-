import React from 'react';
import { Home, MessageSquare, Plus, ShoppingBag, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 'home' | 'chat' | 'post' | 'my_ads' | 'profile';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenPostAd: () => void;
  unreadChatCount?: number;
  myAdsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenPostAd,
  unreadChatCount = 0,
  myAdsCount = 0
}) => {
  const { t } = useLanguage();

  return (
    <nav 
      aria-label="মোবাইল নেভিগেশন"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl pb-safe"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around relative">
        
        {/* 1. Home Button */}
        <button
          onClick={() => onTabChange('home')}
          id="nav-tab-home"
          className={`flex flex-col items-center justify-center w-16 py-1 cursor-pointer transition ${
            activeTab === 'home' ? 'text-[#FF6600] font-bold' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t('nav.home', 'হোম')}</span>
        </button>

        {/* 2. Chat Button */}
        <button
          onClick={() => onTabChange('chat')}
          id="nav-tab-chat"
          className={`flex flex-col items-center justify-center w-16 py-1 cursor-pointer relative transition ${
            activeTab === 'chat' ? 'text-[#FF6600] font-bold' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 mb-0.5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#FF6600] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">{t('nav.chat', 'চ্যাট')}</span>
        </button>

        {/* 3. Center Geometric Floating Action Button (বিজ্ঞাপন দিন) */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={onOpenPostAd}
            id="nav-floating-post-ad"
            className="w-13 h-13 rounded-full bg-[#FF6600] hover:bg-[#e65c00] text-white shadow-lg shadow-orange-300/50 border-4 border-[#F4F7F9] flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="বিজ্ঞাপন দিন"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
          <span className="text-[10px] text-[#FF6600] font-bold mt-0.5">{t('nav.post_ad', 'বিজ্ঞাপন দিন')}</span>
        </div>

        {/* 4. My Ads Button (আমার বিজ্ঞাপন) */}
        <button
          onClick={() => onTabChange('my_ads')}
          id="nav-tab-my-ads"
          className={`flex flex-col items-center justify-center w-16 py-1 cursor-pointer relative transition ${
            activeTab === 'my_ads' ? 'text-[#FF6600] font-bold' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {myAdsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#FF6600] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {myAdsCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">{t('nav.my_ads', 'আমার বিজ্ঞাপন')}</span>
        </button>

        {/* 5. Profile Button */}
        <button
          onClick={() => onTabChange('profile')}
          id="nav-tab-profile"
          className={`flex flex-col items-center justify-center w-16 py-1 cursor-pointer transition ${
            activeTab === 'profile' ? 'text-[#FF6600] font-bold' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t('nav.profile', 'প্রোফাইল')}</span>
        </button>

      </div>
    </nav>
  );
};


