import React from 'react';
import { Plus, LogIn } from 'lucide-react';
import { SiteSettings, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  settings: SiteSettings;
  user: UserProfile | null;
  onOpenPostAd: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onNavigateProfile: () => void;
  hidePostAdButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  onOpenPostAd,
  onOpenAuth,
  onNavigateHome,
  hidePostAdButton = false,
}) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-xs w-full max-w-[100vw]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        
        {/* Dynamic Prominent Brand Logo Section */}
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0 min-w-0"
          id="site-logo-container"
        >
          {settings.logoUrl ? (
            <div className="flex items-center gap-2">
              <img 
                src={settings.logoUrl} 
                alt={settings.siteName || 'BechoKino.com'} 
                className="w-[180px] sm:w-[220px] max-h-11 sm:max-h-12 object-contain hover:scale-102 transition-transform"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if image URL is invalid
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="sr-only">{settings.siteName}</span>
            </div>
          ) : (
            /* Prominent Geometric Balance BK Emblem & Brand Logo */
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#FF6600] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shadow-orange-200/80 group-hover:scale-105 transition-transform shrink-0">
                <span className="text-white font-black text-lg sm:text-2xl tracking-tighter">BK</span>
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#0A1128] truncate">
                BechoKino<span className="text-[#FF6600]">.com</span>
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Action Controls (Strict Logged-Out vs Logged-In State) */}
        <div className="flex items-center gap-2 shrink-0">
          {!user ? (
            /* Logged-Out State: ONLY compact "লগইন / সাইন আপ" button on the right */
            <button
              onClick={onOpenAuth}
              id="btn-header-login"
              className="bg-white hover:bg-orange-50/70 active:scale-95 text-[#0A1128] border border-[#FF6600]/70 hover:border-[#FF6600] px-3 sm:px-4 py-1.5 rounded-full font-bold text-xs sm:text-xs flex items-center gap-1 shadow-2xs transition duration-150 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF6600] shrink-0" />
              <span>{t('nav.login_register', 'লগইন / সাইন আপ')}</span>
            </button>
          ) : !hidePostAdButton ? (
            /* Logged-In State: ONLY "বিজ্ঞাপন দিন" (Post Ad) button on the right */
            <button
              onClick={onOpenPostAd}
              id="btn-header-post-ad"
              className="bg-[#FF6600] hover:bg-[#e65c00] active:scale-95 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-200/80 transition duration-150 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('nav.post_ad', 'বিজ্ঞাপন দিন')}</span>
            </button>
          ) : null}
        </div>

      </div>
    </header>
  );
};




