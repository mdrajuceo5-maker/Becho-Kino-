import React from 'react';
import { Camera, Clock, Folder, Heart, MapPin, Star } from 'lucide-react';
import { Ad } from '../types';

interface AdCardProps {
  ad: Ad;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

// Convert English digits to Bengali digits for authentic look
export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
}

export function formatTakaPrice(price: number): string {
  const formatted = price.toLocaleString('en-IN');
  return `৳ ${toBengaliNumber(formatted)}`;
}

export const AdCard: React.FC<AdCardProps> = ({
  ad,
  onClick,
  isFavorite = false,
  onToggleFavorite
}) => {
  return (
    <div 
      onClick={onClick}
      id={`ad-card-${ad.id}`}
      className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col group"
    >
      {/* 100% CLEAR Product Image Container without any text, price or username overlays */}
      <div className="relative aspect-4/3 sm:aspect-16/11 w-full bg-slate-100 overflow-hidden">
        <img
          src={ad.images[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80'}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Top-Right Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(e);
          }}
          className="absolute top-2 right-2 w-7.5 h-7.5 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 shadow-sm transition active:scale-90 z-10 cursor-pointer"
          title="পছন্দের তালিকায় রাখুন"
        >
          <Heart 
            className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} 
          />
        </button>

        {/* Multi-image indicator badge */}
        {ad.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span>{toBengaliNumber(ad.images.length)}</span>
          </div>
        )}
      </div>

      {/* Card Body - Price, User Name, Title, and Location cleanly placed BELOW the image */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between h-[190px] sm:h-[200px] box-border">
        
        <div>
          {/* 1. CRITICAL PRICE LAYOUT - Full width, clean, bold display without cramping */}
          <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
            <span className="text-[#FF6600] font-black text-sm sm:text-[16px] tracking-tight">
              {formatTakaPrice(ad.price)}
            </span>
          </div>

          {/* 2. Seller Name & Time Posted */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 h-4">
            <span className="font-medium text-[#0A1128] truncate max-w-[60%]">
              {ad.sellerName || 'বিক্রেতা'}
            </span>
            <div className="flex items-center gap-1 text-gray-400 shrink-0 text-[10px]">
              <Clock className="w-3 h-3" />
              <span className="truncate">{ad.postedAt}</span>
            </div>
          </div>

          {/* 3. Ad Title (Strict 2-line fixed height) */}
          <h3 className="font-bold text-[#0A1128] text-xs sm:text-sm line-clamp-2 h-9 mb-1.5 group-hover:text-[#FF6600] transition leading-snug">
            {ad.title}
          </h3>

          {/* Category & Condition Badges */}
          <div className="flex items-center gap-1.5 overflow-hidden text-[10px] font-semibold h-5 mb-1">
            <span className="text-[#FF6600] bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 truncate max-w-[65%]">
              <Folder className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{ad.category}</span>
            </span>
            {ad.condition && (
              <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                {ad.condition === 'new' ? 'নতুন' : 'ব্যবহৃত'}
              </span>
            )}
            {ad.featured && (
              <span className="text-white bg-[#0A1128] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold shrink-0">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span>ফিচার্ড</span>
              </span>
            )}
          </div>
        </div>

        {/* 4. Location Footer */}
        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1 truncate max-w-[70%]">
            <MapPin className="w-3 h-3 text-[#FF6600] shrink-0" />
            <span className="truncate">{ad.upazila}, {ad.district.split(' ')[0]}</span>
          </div>

          <span className="text-[11px] text-[#FF6600] font-bold shrink-0 group-hover:translate-x-0.5 transition">
            বিস্তারিত →
          </span>
        </div>

      </div>
    </div>
  );
};

