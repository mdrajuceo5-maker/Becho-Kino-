import React from 'react';
import { CATEGORIES_LIST } from '../data/bangladeshData';

interface CategoryTabsProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onSelectCategory
}) => {
  return (
    <nav aria-label="বিজ্ঞাপন ক্যাটাগরি" className="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-sm whitespace-nowrap">
        {CATEGORIES_LIST.map((cat) => {
          const isActive = activeCategory === cat.id || (activeCategory === 'all' && cat.id === 'all');
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              id={`tab-category-${cat.id}`}
              className={`px-4 sm:px-5 py-2 rounded-lg font-bold transition duration-150 shrink-0 cursor-pointer text-xs sm:text-sm ${
                isActive
                  ? 'bg-[#0A1128] text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-[#FF6600] hover:text-[#FF6600] hover:bg-orange-50/50'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

