import React from 'react';
import { Lock } from 'lucide-react';
import { SiteSettings } from '../types';

interface FooterProps {
  settings: SiteSettings;
  onOpenAdmin?: () => void;
  onOpenBlog?: () => void;
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  settings, 
  onOpenAdmin,
  onOpenBlog,
  onOpenAbout,
  onOpenContact,
  onOpenPrivacy,
  onOpenTerms
}) => {
  const telegramHref = settings.telegramUrl || 'https://t.me/bechokino';
  const facebookHref = settings.facebookUrl || 'https://facebook.com/bechokino';
  const emailHref = `mailto:${settings.contactEmail || 'support@bechokino.com'}`;

  return (
    <footer className="bg-orange-50/90 text-[#0A1128] pt-10 pb-24 sm:pb-12 border-t border-orange-200/70 w-full overflow-x-hidden">
      <div className="max-w-md mx-auto px-4 text-center flex flex-col items-center justify-center space-y-6">
        
        {/* Top: Dynamic Centered Logo */}
        <div className="flex items-center justify-center">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName || 'BechoKino.com'}
              className="h-10 sm:h-12 max-w-[200px] object-contain bg-transparent mix-blend-multiply"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF6600] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
                BK
              </div>
              <span className="text-2xl font-black tracking-tight text-[#0A1128]">
                Becho<span className="text-[#FF6600]">Kino</span><span className="text-emerald-800">.com</span>
              </span>
            </div>
          )}
        </div>

        {/* Section 1: About BechoKino */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-base text-[#0A1128]">
            About BechoKino
          </h3>
          <div className="flex flex-col items-center space-y-1.5 text-sm font-medium text-gray-700">
            <button
              type="button"
              onClick={onOpenAbout}
              className="hover:text-[#FF6600] hover:underline transition cursor-pointer"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-[#FF6600] hover:underline transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-[#FF6600] hover:underline transition cursor-pointer"
            >
              Terms & Conditions
            </button>
          </div>
        </div>

        {/* Section 2: Agreement */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-base text-[#0A1128]">
            Agreement
          </h3>
          <div className="flex flex-col items-center space-y-1.5 text-sm font-medium text-gray-700">
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-[#FF6600] hover:underline transition cursor-pointer"
            >
              Microjob Marketplace
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-[#FF6600] hover:underline transition cursor-pointer"
            >
              Deal Marketplace
            </button>
          </div>
        </div>

        {/* Section 3: Social Media (Telegram Cyan, Facebook Blue, Email Red) */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-base text-[#0A1128]">
            Social Media
          </h3>
          
          <div className="flex items-center justify-center gap-3">
            {/* Telegram (Cyan) */}
            <a
              href={telegramHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
              className="w-8 h-8 rounded-lg bg-[#29b6f6] hover:bg-[#039be5] active:scale-95 text-white flex items-center justify-center shadow-xs transition"
              title="Telegram"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>

            {/* Facebook (Blue) */}
            <a
              href={facebookHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="w-8 h-8 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] active:scale-95 text-white flex items-center justify-center shadow-xs transition"
              title="Facebook"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Email (Red) */}
            <a
              href={emailHref}
              aria-label="Email"
              className="w-8 h-8 rounded-lg bg-[#ea4335] hover:bg-[#d93025] active:scale-95 text-white flex items-center justify-center shadow-xs transition"
              title="Email"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-2">
          <p className="text-xs sm:text-sm font-medium text-gray-600">
            © {new Date().getFullYear()} bechokino.com. All Rights Reserved.
          </p>
        </div>

        {/* Discreet Admin Login Button */}
        {onOpenAdmin && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-[11px] font-bold text-gray-500 hover:text-[#FF6600] transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <Lock className="w-3 h-3 text-[#FF6600]" />
              <span>Admin Access</span>
            </button>

          </div>
        )}

      </div>
    </footer>
  );
};
