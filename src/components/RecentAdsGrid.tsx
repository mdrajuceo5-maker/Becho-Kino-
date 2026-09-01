import React from 'react';
import { ArrowRight, PackageOpen } from 'lucide-react';
import { Ad } from '../types';
import { AdCard } from './AdCard';

interface RecentAdsGridProps {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
  favorites: string[];
  onToggleFavorite: (adId: string) => void;
  onViewAll: () => void;
  title?: string;
  showViewAll?: boolean;
}

export const RecentAdsGrid: React.FC<RecentAdsGridProps> = ({
  ads,
  onSelectAd,
  favorites,
  onToggleFavorite,
  onViewAll,
  title = 'সাম্প্রতিক বিজ্ঞাপনসমূহ',
  showViewAll = true
}) => {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-8 my-5 mb-24 sm:mb-16">
      {/* Header Row with Geometric Balance Accent Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-6 bg-[#FF6600] rounded-full inline-block" />
          <h2 className="text-lg sm:text-2xl font-bold text-[#0A1128]">
            {title}
          </h2>
        </div>

        {showViewAll && (
          <button
            onClick={onViewAll}
            id="btn-view-all-ads"
            className="text-[#FF6600] hover:text-[#e65c00] font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer group transition"
          >
            <span>সব দেখুন</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Grid or Empty state */}
      {ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-12 text-center my-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto mb-3.5">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#0A1128] mb-1">কোনো বিজ্ঞাপন পাওয়া যায়নি</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            আপনার নির্বাচিত ফিল্টার বা অনুসন্ধানের সাথে মিলে এমন কোনো বিজ্ঞাপন এই মুহূর্তে নেই। ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onClick={() => onSelectAd(ad)}
              isFavorite={favorites.includes(ad.id)}
              onToggleFavorite={() => onToggleFavorite(ad.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

