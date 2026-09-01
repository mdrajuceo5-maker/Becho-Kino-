import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Heart, 
  MapPin, 
  MessageCircle, 
  Phone, 
  ShieldAlert, 
  Tag, 
  Trash2, 
  X,
  Flag,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Ad, UserProfile } from '../types';
import { formatTakaPrice, toBengaliNumber } from './AdCard';
import { submitReport } from '../lib/firebase';

interface AdDetailsViewProps {
  ad: Ad;
  onBack: () => void;
  onDeleteAd: (adId: string, pin: string) => Promise<boolean>;
  onSelectRelatedAd: (ad: Ad) => void;
  relatedAds: Ad[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  currentUser?: UserProfile | null;
  onOpenChat?: (adId: string) => void;
}

export const AdDetailsView: React.FC<AdDetailsViewProps> = ({
  ad,
  onBack,
  onDeleteAd,
  onSelectRelatedAd,
  relatedAds,
  isFavorite,
  onToggleFavorite,
  currentUser,
  onOpenChat
}) => {
  // State for image gallery slider
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('প্রতারণা বা ভুয়া বিজ্ঞাপন');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState('');

  // Check if current user is the owner of this ad or an admin
  const isOwner = Boolean(
    currentUser && (
      (ad.userId && currentUser.uid === ad.userId) ||
      (currentUser.phoneNumber && (ad.phone === currentUser.phoneNumber || ad.phone === currentUser.phoneNumber.replace(/[^0-9]/g, ''))) ||
      (currentUser.phone && (ad.phone === currentUser.phone || ad.phone === currentUser.phone.replace(/[^0-9]/g, ''))) ||
      currentUser.role === 'admin'
    )
  );

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % ad.images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + ad.images.length) % ad.images.length);
  };

  const handleDeleteSubmit = async () => {
    setIsDeleting(true);
    const success = await onDeleteAd(ad.id, ad.deletePin || '1234');
    setIsDeleting(false);
    if (success) {
      setDeleteConfirmOpen(false);
      onBack();
    }
  };

  const handleDirectWhatsAppSeller = () => {
    const rawNumber = ad.sellerWhatsApp || ad.phone;
    let cleanPhone = rawNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '880' + cleanPhone.substring(1);
    }
    const text = encodeURIComponent(`আসসালামু আলাইকুম, আমি BechoKino.com থেকে "${ad.title}" বিজ্ঞাপনটি দেখে নক করেছি।`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      await submitReport({
        reporterId: currentUser?.uid,
        reporterName: currentUser?.displayName || currentUser?.email || 'ব্যবহারকারী',
        reportedUserId: ad.userId || ad.phone,
        reportedUserName: ad.sellerName,
        adId: ad.id,
        adTitle: ad.title,
        reason: reportReason,
        details: reportDetails.trim()
      });
      setReportToast('বিজ্ঞাপনটির বিরুদ্ধে রিপোর্ট সফলভাবে জমা হয়েছে। অ্যাডমিন টিম দ্রুত যাচাই করবে।');
      setIsReportModalOpen(false);
      setReportDetails('');
      setTimeout(() => setReportToast(''), 4000);
    } catch (err: any) {
      alert('রিপোর্ট পাঠাতে সমস্যা হয়েছে: ' + (err.message || 'ত্রুটি'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 mb-24 sm:mb-16">
      
      {/* Report Toast Notification */}
      {reportToast && (
        <div className="fixed top-4 right-4 z-60 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold bg-[#0A1128] text-white border border-emerald-500 flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reportToast}</span>
        </div>
      )}

      {/* Top Header Row with Back Button & Delete Action */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          id="btn-back-to-ads"
          className="bg-white hover:bg-gray-100 border border-gray-300 text-[#0A1128] font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF6600]" />
          <span>ফিরে যান</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Delete Ad Button - ONLY visible to the creator/owner of the ad or admin */}
          {isOwner ? (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              id="btn-open-delete-modal"
              className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>মুছুন</span>
            </button>
          ) : (
            <button
              onClick={() => setIsReportModalOpen(true)}
              id="btn-top-report-ad"
              className="text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>রিপোর্ট</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden mb-4">
        
        {/* Image Slider Gallery */}
        <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-950 flex items-center justify-center overflow-hidden">
          <img
            src={ad.images[currentImageIndex] || ad.images[0]}
            alt={ad.title}
            className="max-h-full max-w-full object-contain"
            referrerPolicy="no-referrer"
          />

          {/* Navigation Arrows */}
          {ad.images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer shadow-md"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Favorite Heart Floating Button */}
          <button
            onClick={onToggleFavorite}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-800 shadow-md transition active:scale-90 cursor-pointer"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
          </button>

          {/* Image Counter Badge */}
          <div className="absolute bottom-3 right-3 bg-black/75 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
            <Camera className="w-3.5 h-3.5" />
            <span>{toBengaliNumber(currentImageIndex + 1)} / {toBengaliNumber(ad.images.length)}</span>
          </div>
        </div>

        {/* Thumbnail Selector Row */}
        {ad.images.length > 1 && (
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 border-b border-gray-200 overflow-x-auto no-scrollbar">
            {ad.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                  currentImageIndex === idx ? 'border-[#FF6600] ring-2 ring-orange-200' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}

        {/* Ad Title & Metadata Section */}
        <div className="p-4 sm:p-6">
          
          {/* Category Tag, Condition & Price Type Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 bg-[#FF6600] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
              📁 {ad.category}
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 text-[#0A1128] text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
              {ad.condition === 'new' ? '✨ একদম নতুন (Brand New)' : '🔄 ব্যবহৃত / Second-hand'}
            </span>
            {ad.isNegotiable ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                🤝 আলোচনা সাপেক্ষ (Negotiable)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                🏷️ ফিক্সড প্রাইস (Fixed Price)
              </span>
            )}
            {ad.packageName && (
              <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                ✨ {ad.packageName}
              </span>
            )}
          </div>

          {/* Ad Title */}
          <h1 className="text-xl sm:text-2xl font-black text-[#0A1128] mb-2 leading-snug">
            {ad.title}
          </h1>

          {/* Product Model */}
          {ad.model && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
              <Tag className="w-4 h-4 text-[#FF6600]" />
              <span>প্রোডাক্ট মডেল:</span>
              <span className="bg-[#0A1128] text-white text-xs font-bold px-2.5 py-0.5 rounded-lg">
                {ad.model}
              </span>
            </div>
          )}

          {/* Location & Post Date */}
          <div className="space-y-1 text-xs sm:text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#FF6600] shrink-0" />
              <span>{ad.upazila}, {ad.district}, {ad.division}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>প্রকাশিত হয়েছে: {ad.postedAt}</span>
              <span className="text-gray-300">•</span>
              <Eye className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{toBengaliNumber(ad.views)} বার দেখা হয়েছে</span>
            </div>
          </div>

          {/* Price Box */}
          <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4 my-3.5 flex items-center justify-between flex-wrap gap-2.5">
            <div>
              <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">
                নির্ধারিত মূল্য
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#FF6600] tracking-tight">
                {formatTakaPrice(ad.price)}
              </div>
            </div>

            <div>
              {ad.isNegotiable ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl shadow-2xs">
                    🤝 আলোচনা সাপেক্ষ
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">দরদাম করে কেনার সুযোগ আছে</span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs">
                    🔒 ফিক্সড প্রাইস
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">মূল্য চূড়ান্ত ও অপরিবর্তনীয়</span>
                </div>
              )}
            </div>
          </div>

          {/* Specifications Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 block text-[10px]">কন্ডিশন</span>
              <span className="font-bold text-[#0A1128]">
                {ad.condition === 'new' ? 'একদম নতুন' : 'ব্যবহৃত'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 block text-[10px]">মূল্যের ধরন</span>
              <span className={`font-bold ${ad.isNegotiable ? 'text-amber-800' : 'text-emerald-700'}`}>
                {ad.isNegotiable ? 'আলোচনা সাপেক্ষ' : 'ফিক্সড প্রাইস'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 block text-[10px]">ক্যাটাগরি</span>
              <span className="font-bold text-[#0A1128] truncate block">{ad.category}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 block text-[10px]">অবস্থান</span>
              <span className="font-bold text-[#0A1128] truncate block">{ad.district}</span>
            </div>
          </div>

          {/* Description Section */}
          <div className="my-4">
            <h2 className="text-base font-bold text-[#0A1128] mb-2">বিজ্ঞাপনের বিবরণ:</h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
              {ad.description}
            </div>
          </div>

        </div>

      </div>

      {/* Seller Contact Area (Two Distinct Compact Buttons: Call & WhatsApp Side-by-Side) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs mb-4">
        <h2 className="text-xs sm:text-sm font-bold text-center text-[#0A1128] mb-3">
          বিক্রেতার সাথে যোগাযোগ করুন
        </h2>

        {/* 1 & 2: Call and WhatsApp side-by-side in a responsive compact row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Call Button */}
          {!showPhone ? (
            <button
              type="button"
              onClick={() => setShowPhone(true)}
              id="btn-seller-call-reveal"
              className="w-full bg-[#1e824c] hover:bg-[#16693d] active:scale-[0.98] text-white font-black py-2.5 sm:py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-md shadow-emerald-200/80 transition duration-150 cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-white shrink-0" />
              <span className="truncate">কল করুন</span>
            </button>
          ) : (
            <a
              href={`tel:${ad.sellerPhone || ad.phone}`}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-2.5 sm:py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-md transition duration-150 cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-white shrink-0" />
              <span className="truncate">{ad.sellerPhone || ad.phone}</span>
            </a>
          )}

          {/* WhatsApp Button with Official Undistorted SVG */}
          <button
            type="button"
            onClick={handleDirectWhatsAppSeller}
            id="btn-seller-whatsapp-direct"
            className="w-full bg-[#25d366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-black py-2.5 sm:py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-md shadow-green-200/80 transition duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span className="truncate">WhatsApp</span>
          </button>
        </div>

        {/* 3. ইনবক্স চ্যাট করুন (Compact Live Chat Button) */}
        {onOpenChat && (
          <button
            type="button"
            onClick={() => onOpenChat(ad.id)}
            id="btn-seller-fullscreen-chat"
            className="w-full mt-2.5 bg-[#0A1128] hover:bg-black active:scale-[0.99] text-white font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm transition duration-150 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#FF6600]" />
            <span>সরাসরি চ্যাট করুন (Live Chat)</span>
          </button>
        )}

        {/* Safety Disclaimer Warning Box */}
        <div className="mt-3 bg-[#fef9e7] border border-[#f9e79f] text-[#7d6608] text-[11px] sm:text-xs p-2.5 rounded-xl flex items-start gap-2 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-[#b7950b] shrink-0 mt-0.5" />
          <p>
            অগ্রিম অর্থ প্রদান করবেন না, এমনকি ডেলিভারির জন্যও নয়! কোনো প্রকার প্রতারিত হলে, BechoKino.com দায়ী থাকবে না।
          </p>
        </div>

        {/* 4. রিপোর্ট করুন (Report Ad) Button */}
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            id="btn-report-ad"
            className="text-[11px] text-red-600 hover:text-red-700 font-bold inline-flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            <Flag className="w-3 h-3" />
            <span>ভুয়া বা আপত্তিকর বিজ্ঞাপন? রিপোর্ট করুন</span>
          </button>
        </div>

      </div>

      {/* Smart Related Ads (Recommendation System) */}
      {relatedAds.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 font-bold text-base text-[#0A1128] mb-3.5">
            <Tag className="w-4 h-4 text-[#FF6600]" />
            <h2>রিলেটেড অন্যান্য বিজ্ঞাপন</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {relatedAds.slice(0, 4).map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelatedAd(rel)}
                className="bg-white rounded-2xl border border-gray-200/90 p-3 shadow-2xs hover:shadow-md hover:border-orange-200 transition cursor-pointer flex flex-col group"
              >
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-900 mb-2.5 relative">
                  <img
                    src={rel.images[0]}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-[#FF6600] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                    {rel.category}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-[#0A1128] line-clamp-1 mb-1 group-hover:text-[#FF6600] transition">
                  {rel.title}
                </h4>
                <div className="text-[11px] text-gray-500 line-clamp-1 mb-2">
                  {rel.district}
                </div>
                <span className="text-xs sm:text-sm font-black text-[#FF6600] mt-auto">
                  {formatTakaPrice(rel.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0A1128]">বিজ্ঞাপনটির বিরুদ্ধে অভিযোগ</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendReport} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">অভিযোগের কারণ:</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                >
                  <option value="প্রতারণা বা ভুয়া বিজ্ঞাপন">প্রতারণা বা ভুয়া বিজ্ঞাপন (Fraud/Scam)</option>
                  <option value="অশালীন ছবি বা তথ্য">অশালীন ছবি বা তথ্য (Explicit/Offensive)</option>
                  <option value="ভুল দাম বা অনুপযুক্ত তথ্য">ভুল দাম বা অনুপযুক্ত তথ্য (Misleading info)</option>
                  <option value="নিষিদ্ধ বা অবৈধ পণ্য">নিষিদ্ধ বা অবৈধ পণ্য (Prohibited item)</option>
                  <option value="পণ্য বিক্রি হয়ে গেছে">পণ্য ইতিমধ্যে বিক্রি হয়ে গেছে (Already Sold)</option>
                  <option value="অন্যান্য">অন্যান্য (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">বিস্তারিত বিবরণ (ঐচ্ছিক):</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="যেমন: বিক্রেতা অগ্রিম টাকা দাবি করছে..."
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>রিপোর্ট জমা দিন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Ad Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>বিজ্ঞাপন মুছে ফেলুন</span>
              </div>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-gray-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-4">
              আপনি কি নিশ্চিত যে আপনি এই বিজ্ঞাপনটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
