import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, searchQuery }) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  return (
    <section className="bg-white px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex flex-col items-center text-center">
      {/* Title & Subtitle Matching 001.jpg */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0A1128] mb-1 tracking-tight">
        Buy & Sell
      </h1>
      
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#FF6600] mb-1.5 tracking-tight drop-shadow-xs">
        বাংলাদেশে ক্রয় বিক্রয় এর বিশ্বস্ত প্ল্যাটফর্ম
      </h2>

      <p className="text-gray-600 mb-4 sm:mb-5 font-bold text-xs sm:text-sm">
        সহজেই বিক্রয় করুন আপনার পণ্য।
      </p>

      {/* Exact Search Bar Layout Matching 001.jpg */}
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-2xl flex shadow-xs rounded-xl sm:rounded-2xl overflow-hidden border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[#FF6600]/40 transition"
      >
        <div className="pl-3.5 sm:pl-4.5 flex items-center justify-center text-gray-400">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          id="hero-search-input"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            if (e.target.value === '') {
              onSearch('');
            }
          }}
          placeholder="প্রোডাক্ট খুঁজুন..."
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm md:text-base focus:outline-none text-[#1A202C] placeholder-gray-400 bg-transparent min-w-0"
        />

        <button
          type="submit"
          id="btn-hero-search"
          className="bg-[#FF6600] hover:bg-[#e65c00] text-white px-6 sm:px-9 py-2.5 sm:py-3.5 font-bold text-xs sm:text-sm md:text-base transition cursor-pointer shrink-0"
        >
          খুঁজুন
        </button>
      </form>
    </section>
  );
};

