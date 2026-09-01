import React, { useMemo } from 'react';
import { ChevronDown, Filter, MapPin, X } from 'lucide-react';
import { DivisionLocation } from '../types';

interface LocationFilterProps {
  divisions: DivisionLocation[];
  selectedDivision: string;
  selectedDistrict: string;
  selectedUpazila: string;
  onDivisionChange: (division: string) => void;
  onDistrictChange: (district: string) => void;
  onUpazilaChange: (upazila: string) => void;
  onApplyFilter: () => void;
  onResetFilter: () => void;
  isFiltered: boolean;
}

export const LocationFilter: React.FC<LocationFilterProps> = ({
  divisions,
  selectedDivision,
  selectedDistrict,
  selectedUpazila,
  onDivisionChange,
  onDistrictChange,
  onUpazilaChange,
  onApplyFilter,
  onResetFilter,
  isFiltered
}) => {
  // Compute available districts based on selected division
  const availableDistricts = useMemo(() => {
    if (!selectedDivision || selectedDivision === 'all') return [];
    const div = divisions.find(d => d.name === selectedDivision);
    return div ? div.districts : [];
  }, [divisions, selectedDivision]);

  // Compute available upazilas based on selected district
  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict || selectedDistrict === 'all') return [];
    const dist = availableDistricts.find(d => d.name === selectedDistrict);
    return dist ? dist.upazilas : [];
  }, [availableDistricts, selectedDistrict]);

  return (
    <section className="max-w-6xl mx-auto px-3 sm:px-6 my-2.5 sm:my-3.5">
      <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 sm:p-4 shadow-xs">
        
        {/* Header with Title & Reset option */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 font-bold text-[#0A1128] text-xs sm:text-sm">
            <MapPin className="w-4 h-4 text-[#FF6600] shrink-0" />
            <span>এলাকা অনুযায়ী ফিল্টার করুন:</span>
          </div>

          {isFiltered && (
            <button
              onClick={onResetFilter}
              className="text-[11px] text-[#FF6600] hover:text-[#e65c00] flex items-center gap-1 font-bold cursor-pointer transition"
            >
              <X className="w-3 h-3" />
              <span>রিসেট ফিল্টার</span>
            </button>
          )}
        </div>

        {/* 3 Dropdown Filters in a Row matching image.png */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          
          {/* Division Select */}
          <div className="relative">
            <select
              id="filter-division-select"
              value={selectedDivision}
              onChange={(e) => onDivisionChange(e.target.value)}
              className="w-full h-9 sm:h-10 px-2 sm:px-3 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-xs sm:text-sm font-medium focus:ring-1 focus:ring-[#FF6600] focus:border-[#FF6600] outline-none text-[#1A202C] pr-6 sm:pr-8 appearance-none transition cursor-pointer"
            >
              <option value="all">সব বিভাগ</option>
              {divisions.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* District Select */}
          <div className="relative">
            <select
              id="filter-district-select"
              value={selectedDistrict}
              disabled={!selectedDivision || selectedDivision === 'all'}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full h-9 sm:h-10 px-2 sm:px-3 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-xs sm:text-sm font-medium focus:ring-1 focus:ring-[#FF6600] focus:border-[#FF6600] outline-none disabled:bg-gray-50 disabled:text-gray-400 text-[#1A202C] pr-6 sm:pr-8 appearance-none transition cursor-pointer"
            >
              <option value="all">
                {selectedDivision && selectedDivision !== 'all' ? 'সব জেলা' : 'সব জেলা'}
              </option>
              {availableDistricts.map((dist) => (
                <option key={dist.name} value={dist.name}>
                  {dist.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Upazila Select */}
          <div className="relative">
            <select
              id="filter-upazila-select"
              value={selectedUpazila}
              disabled={!selectedDistrict || selectedDistrict === 'all'}
              onChange={(e) => onUpazilaChange(e.target.value)}
              className="w-full h-9 sm:h-10 px-2 sm:px-3 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-xs sm:text-sm font-medium focus:ring-1 focus:ring-[#FF6600] focus:border-[#FF6600] outline-none disabled:bg-gray-50 disabled:text-gray-400 text-[#1A202C] pr-6 sm:pr-8 appearance-none transition cursor-pointer"
            >
              <option value="all">
                {selectedDistrict && selectedDistrict !== 'all' ? 'সব উপজেলা' : 'সব উপজেলা'}
              </option>
              {availableUpazilas.map((upazila) => (
                <option key={upazila} value={upazila}>
                  {upazila}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>

        {/* Full-width Dark Navy Filter Action Button matching image.png */}
        <button
          onClick={onApplyFilter}
          id="btn-apply-location-filter"
          className="w-full h-10 sm:h-11 bg-[#0A1128] hover:bg-black active:scale-[0.99] text-white rounded-lg font-bold text-xs sm:text-sm transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <Filter className="w-4 h-4 text-white" />
          <span>ফিল্টার করুন</span>
        </button>

      </div>
    </section>
  );
};

