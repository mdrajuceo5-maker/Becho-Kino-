import React, { useState } from 'react';
import { Edit3, Eye, Plus, ShoppingBag, Trash2, Clock, MapPin } from 'lucide-react';
import { Ad } from '../types';
import { formatTakaPrice, toBengaliNumber } from './AdCard';


interface MyAdsViewProps {
  ads: Ad[];
  onOpenPostAd: () => void;
  onSelectAd: (ad: Ad) => void;
  onDeleteAd: (adId: string, pin: string) => Promise<boolean>;
  onEditAd: (ad: Ad) => void;
}

export const MyAdsView: React.FC<MyAdsViewProps> = ({
  ads,
  onOpenPostAd,
  onSelectAd,
  onDeleteAd,
  onEditAd
}) => {
  const [adToDelete, setAdToDelete] = useState<Ad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!adToDelete) return;
    setIsDeleting(true);
    const success = await onDeleteAd(adToDelete.id, adToDelete.deletePin || '1234');
    setIsDeleting(false);
    if (success) {
      setAdToDelete(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 mb-24 sm:mb-16 min-h-[60vh]">
      {/* Title matching theme */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-[#FF6600] rounded-full"></div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0A1128]">
            আমার বিজ্ঞাপনসমূহ
          </h1>
        </div>
      </div>

      {ads.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 text-center my-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#FF6600] flex items-center justify-center mx-auto mb-3 border border-orange-200">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <p className="text-base sm:text-lg text-[#0A1128] font-bold mb-2">
            আপনার কোনো বিজ্ঞাপন নেই।
          </p>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-5">
            ঘরে বসে আপনার ব্যবহৃত যেকোনো পণ্য সহজে বিক্রি করুন লাখো ক্রেতার কাছে।
          </p>
          <button
            onClick={onOpenPostAd}
            className="bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-6 py-2.5 rounded-2xl text-sm shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>এখনই বিজ্ঞাপন দিন</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl border border-gray-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-orange-200 transition"
            >
              <div 
                onClick={() => onSelectAd(ad)}
                className="flex items-center gap-3.5 cursor-pointer flex-1"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={ad.images[0]}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {ad.status === 'pending' ? (
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>রিভিউ হচ্ছে (In Review)</span>
                      </span>
                    ) : ad.status === 'rejected' ? (
                      <span className="bg-red-100 border border-red-300 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span>প্রত্যাখ্যাত (Rejected)</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span>সক্রিয় (Active)</span>
                      </span>
                    )}

                    {ad.packageName && (
                      <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {ad.packageName}
                      </span>
                    )}

                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {toBengaliNumber(ad.views || 0)} বার দেখা হয়েছে
                    </span>
                  </div>

                  {ad.status === 'pending' && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg mb-1 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>TrxID ভেরিফিকেশনের পর আপনার বিজ্ঞাপনটি ওয়েবসাইটে লাইভ হবে।</span>
                    </div>
                  )}

                  <h3 className="font-bold text-[#0A1128] text-sm sm:text-base line-clamp-1 hover:text-[#FF6600] transition">
                    {ad.title}
                  </h3>
                  <div className="text-xs sm:text-sm text-[#FF6600] font-black mt-0.5">
                    {formatTakaPrice(ad.price)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>{ad.upazila}, {ad.district} • {ad.postedAt}</span>
                  </div>
                </div>
              </div>

              {/* STRICTLY TWO ACTION BUTTONS: "এডিট করুন" and "ডিলিট করুন" */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                {/* 1. এডিট করুন Button */}
                <button
                  type="button"
                  onClick={() => onEditAd(ad)}
                  id={`btn-edit-ad-${ad.id}`}
                  className="bg-slate-100 hover:bg-slate-200 text-[#0A1128] border border-gray-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#FF6600]" />
                  <span>এডিট করুন</span>
                </button>

                {/* 2. ডিলিট করুন Button */}
                <button
                  type="button"
                  onClick={() => setAdToDelete(ad)}
                  id={`btn-delete-ad-${ad.id}`}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ডিলিট করুন</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-[#0A1128] text-center mb-1">
              বিজ্ঞাপন ডিলিট নিশ্চিতকরণ
            </h3>
            
            <p className="text-xs text-gray-600 text-center mb-4">
              আপনি কি নিশ্চিত যে <b>"{adToDelete.title}"</b> বিজ্ঞাপনটি স্থায়ীভাবে ডিলিট করতে চান?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-red-200"
              >
                {isDeleting ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
