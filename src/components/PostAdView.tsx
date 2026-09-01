import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertCircle, 
  Camera, 
  Check, 
  CheckCircle2, 
  ChevronDown, 
  CreditCard, 
  Edit3, 
  Image as ImageIcon, 
  Megaphone, 
  MessageCircle, 
  Phone, 
  Plus, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Upload, 
  User, 
  X,
  Zap,
  Flame,
  Award,
  ArrowLeft,
  Copy
} from 'lucide-react';
import { CATEGORIES_LIST, DEFAULT_CATEGORY_PROMO_PRICES } from '../data/bangladeshData';
import { Ad, AdCondition, DivisionLocation, PaymentTransaction, SiteSettings, SubscriptionPackage, UserProfile } from '../types';
import { DEFAULT_PACKAGES, saveFirestoreAd, savePaymentTransaction, updateFirestoreAd } from '../lib/firebase';

interface PostAdViewProps {
  onBack: () => void;
  divisions: DivisionLocation[];
  onAdCreated: (newAd: Ad) => void;
  onAdUpdated?: (updatedAd: Ad) => void;
  onProceedToPayment?: (ad: Ad, packageDetails: { id: string; name: string; days: number; amount: number }) => void;
  editingAd?: Ad | null;
  currentUser?: UserProfile | null;
  packages?: SubscriptionPackage[];
  bkashNumber?: string;
  nagadNumber?: string;
  categoryPromoPricing?: Record<string, { top7: number; top30: number; boostMonth: number }>;
}

type PromoOptionType = 'free' | 'top_7' | 'top_30' | 'boost_month';

export const PostAdView: React.FC<PostAdViewProps> = ({
  onBack,
  divisions,
  onAdCreated,
  onAdUpdated,
  onProceedToPayment,
  editingAd = null,
  currentUser,
  packages = DEFAULT_PACKAGES,
  bkashNumber = '01956629330',
  nagadNumber = '01956629330',
  categoryPromoPricing
}) => {
  // Form Fields - Blank minimal inputs
  const [title, setTitle] = useState('');
  const [condition] = useState<AdCondition>('used'); // Strict second-hand only platform
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [description, setDescription] = useState('');
  
  // Smart Clean Price state (Glitch-free)
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);

  // Contact Details (Blank by default)
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sellerName, setSellerName] = useState('');
  
  // Images (Compact upload)
  const [images, setImages] = useState<string[]>([]);
  
  // Same-Page Promo Selection (matching image_2ea006.png)
  const [selectedPromo, setSelectedPromo] = useState<PromoOptionType>('free');
  
  // Payment Details (Shown if selectedPromo !== 'free')
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  // Dynamic Category Pricing calculation
  const currentPricing = useMemo(() => {
    const custom = categoryPromoPricing?.[category] || categoryPromoPricing?.['default'];
    const def = DEFAULT_CATEGORY_PROMO_PRICES[category] || DEFAULT_CATEGORY_PROMO_PRICES['default'] || { top7: 99, top30: 299, boostMonth: 499 };
    return {
      top7: custom?.top7 ?? def.top7,
      top30: custom?.top30 ?? def.top30,
      boostMonth: custom?.boostMonth ?? def.boostMonth
    };
  }, [category, categoryPromoPricing]);

  // When editingAd changes, populate or clear form
  useEffect(() => {
    if (editingAd) {
      setTitle(editingAd.title || '');
      setCategory(editingAd.category || '');
      setModel(editingAd.model || '');
      setDivision(editingAd.division || '');
      setDistrict(editingAd.district || '');
      setUpazila(editingAd.upazila || '');
      setDescription(editingAd.description || '');
      setPrice(editingAd.price ? String(editingAd.price) : '');
      setIsNegotiable(editingAd.isNegotiable ?? false);
      setPhone(editingAd.phone || editingAd.sellerPhone || '');
      setWhatsapp(editingAd.sellerWhatsApp || editingAd.phone || '');
      setSellerName(editingAd.sellerName || '');
      setImages(editingAd.images || []);
      setSelectedPromo('free');
    } else {
      setTitle('');
      setCategory('');
      setModel('');
      setDivision('');
      setDistrict('');
      setUpazila('');
      setDescription('');
      setPrice('');
      setIsNegotiable(false);
      setPhone('');
      setWhatsapp('');
      setSellerName('');
      setImages([]);
      setSelectedPromo('free');
      setSenderNumber('');
      setTrxId('');
      setErrorMessage('');
    }
  }, [editingAd]);

  // Selected Division object to populate dependent Districts
  const selectedDivisionObj = useMemo(() => {
    return divisions.find(d => d.name.includes(division) || division.includes(d.name));
  }, [divisions, division]);

  const availableDistricts = useMemo(() => {
    return selectedDivisionObj?.districts || [];
  }, [selectedDivisionObj]);

  // Selected District object to populate dependent Upazilas
  const selectedDistrictObj = useMemo(() => {
    return availableDistricts.find(d => d.name.includes(district) || district.includes(d.name));
  }, [availableDistricts, district]);

  const availableUpazilas = useMemo(() => {
    return selectedDistrictObj?.upazilas || [];
  }, [selectedDistrictObj]);

  // Format and Handle Price Input smoothly (supports both English & Bengali numerals)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const bnConverted = val.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const cleanDigits = bnConverted.replace(/[^0-9]/g, '');
    setPrice(cleanDigits);
  };

  // Image Upload handler with client-side compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      alert('সর্বোচ্চ ৫টি ছবি আপলোড করা যাবে।');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImages((prev) => [...prev, compressedDataUrl]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const calculatePackageDetails = () => {
    if (selectedPromo === 'top_7') {
      return {
        name: 'Top Ad (৭ দিন)',
        days: 7,
        price: currentPricing.top7
      };
    }
    if (selectedPromo === 'top_30') {
      return {
        name: 'Top Ad (৩০ দিন)',
        days: 30,
        price: currentPricing.top30
      };
    }
    if (selectedPromo === 'boost_month') {
      return {
        name: 'Boost Ad (১ মাস)',
        days: 30,
        price: currentPricing.boostMonth
      };
    }
    return null;
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Form Validations
    if (!category) {
      setErrorMessage('অনুগ্রহ করে পণ্যের ক্যাটাগরি নির্বাচন করুন।');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('অনুগ্রহ করে বিজ্ঞাপনের শিরোনাম দিন।');
      return;
    }
    if (!division || !district || !upazila) {
      setErrorMessage('অনুগ্রহ করে বিভাগ, জেলা এবং উপজেলা/থানা সিলেক্ট করুন।');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক মূল্য উল্লেখ করুন।');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('অনুগ্রহ করে ফোন নম্বর দিন।');
      return;
    }

    setIsSubmitting(true);

    try {
      const pkgDetails = calculatePackageDetails();
      const isPaid = selectedPromo !== 'free' && Boolean(pkgDetails);
      const adId = editingAd ? editingAd.id : 'ad-' + Date.now();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + adId.slice(-4);
      
      const parsedPrice = Number(price);

      const defaultImg = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
      const finalImages = images.length > 0 ? images : [defaultImg];

      const now = new Date();
      let expiryDateStr: string | undefined = undefined;
      if (pkgDetails) {
        const exp = new Date(now.getTime() + pkgDetails.days * 24 * 60 * 60 * 1000);
        expiryDateStr = exp.toISOString();
      }

      if (editingAd) {
        const updatedData: Partial<Ad> = {
          title: title.trim(),
          category: category,
          model: model.trim() || undefined,
          division,
          district,
          upazila,
          description: description.trim(),
          price: parsedPrice,
          isNegotiable,
          phone: phone.trim(),
          sellerName: sellerName.trim() || 'সম্মানিত বিক্রেতা',
          sellerPhone: phone.trim(),
          sellerWhatsApp: whatsapp.trim() || phone.trim(),
          images: finalImages
        };

        await updateFirestoreAd(editingAd.id, updatedData);
        if (onAdUpdated) {
          onAdUpdated({ ...editingAd, ...updatedData });
        }
        onBack();
      } else {
        const newAdObj: Ad = {
          id: adId,
          slug,
          title: title.trim(),
          condition: 'used', // Strict second-hand only platform
          category: category,
          categoryKey: category.toLowerCase(),
          model: model.trim() || undefined,
          division,
          district,
          upazila,
          description: description.trim(),
          price: parsedPrice,
          isNegotiable,
          phone: phone.trim(),
          images: finalImages,
          featured: isPaid,
          userId: currentUser?.uid || 'guest-user',
          sellerName: sellerName.trim() || 'সম্মানিত বিক্রেতা',
          sellerPhone: phone.trim(),
          sellerWhatsApp: whatsapp.trim() || phone.trim(),
          postedAt: 'আজ',
          views: 1,
          status: isPaid ? 'pending' : 'active', // Paid ads start in pending review until payment is verified
          packageId: isPaid ? selectedPromo : undefined,
          packageName: pkgDetails?.name,
          packageDays: pkgDetails?.days,
          packageExpiryDate: expiryDateStr,
          paymentStatus: isPaid ? 'pending' : 'free',
          createdAt: now.toISOString()
        };

        // Save Ad in Firestore
        await saveFirestoreAd(newAdObj);

        // If paid promotion, redirect to dedicated /payment gateway
        if (isPaid && pkgDetails && onProceedToPayment) {
          onProceedToPayment(newAdObj, {
            id: selectedPromo,
            name: pkgDetails.name,
            days: pkgDetails.days,
            amount: pkgDetails.price
          });
        } else {
          onAdCreated(newAdObj);
          onBack();
        }
      }
    } catch (err: any) {
      console.error('Error saving ad:', err);
      setErrorMessage(err.message || 'বিজ্ঞাপন সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 mb-24 sm:mb-16">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            id="btn-postad-back"
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl text-gray-700 transition cursor-pointer"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5 text-[#0A1128]" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-black text-[#0A1128] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#FF6600]" />
              <span>{editingAd ? 'বিজ্ঞাপন এডিট করুন' : 'নতুন বিজ্ঞাপন দিন (Post Ad)'}</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              সঠিক তথ্য দিয়ে দ্রুত এবং সহজে ব্যবহৃত পণ্য বিক্রয় করুন
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          বাতিল করুন
        </button>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmitAd} className="space-y-5 text-[#1A202C]">
          
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xs sm:text-sm font-black text-[#0A1128] uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6600]"></span>
              <span>পণ্যের বিবরণ ও ক্যাটাগরি</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                  ক্যাটাগরি *
                </label>
                <div className="relative">
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm appearance-none bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  >
                    <option value="">ক্যাটাগরি সিলেক্ট করুন</option>
                    {CATEGORIES_LIST.filter(c => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                  বিজ্ঞাপনের শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder=""
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                প্রোডাক্ট মডেল (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>
          </div>

          {/* Section 2: Location Dependent Dropdowns */}
          <div className="bg-slate-50 border border-gray-200/80 rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></span>
              <span>অবস্থান নির্বাচন করুন (Location)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">
                  বিভাগ *
                </label>
                <div className="relative">
                  <select
                    required
                    value={division}
                    onChange={(e) => {
                      setDivision(e.target.value);
                      setDistrict('');
                      setUpazila('');
                    }}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  >
                    <option value="">বিভাগ সিলেক্ট করুন</option>
                    {divisions.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">
                  জেলা *
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={!division}
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setUpazila('');
                    }}
                    className="w-full bg-white border border-gray-300 disabled:bg-gray-100 rounded-xl px-3 py-2 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  >
                    <option value="">{division ? 'জেলা সিলেক্ট করুন' : 'আগে বিভাগ সিলেক্ট করুন'}</option>
                    {availableDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">
                  উপজেলা / থানা *
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={!district}
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full bg-white border border-gray-300 disabled:bg-gray-100 rounded-xl px-3 py-2 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                  >
                    <option value="">{district ? 'উপজেলা/থানা সিলেক্ট করুন' : 'আগে জেলা সিলেক্ট করুন'}</option>
                    {availableUpazilas.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Description */}
          <div>
            <label className="block font-bold text-[#0A1128] mb-1 text-xs">
              বিস্তারিত বিবরণ *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=""
              className="w-full border border-gray-300 rounded-xl p-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
            />
          </div>

          {/* Section 4: Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-[#0A1128] text-xs">
                মূল্য (টাকা) *
              </label>
              {price && Number(price) > 0 && (
                <span className="text-[11px] font-bold text-[#FF6600]">
                  ৳ {Number(price).toLocaleString('en-US')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">৳</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={price}
                  onChange={handlePriceChange}
                  placeholder=""
                  className="w-full border border-gray-300 rounded-xl pl-8 pr-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#0A1128] focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer shrink-0 bg-gray-50 hover:bg-gray-100 px-2.5 py-2.5 border border-gray-200 rounded-xl transition select-none">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="rounded text-[#FF6600] focus:ring-[#FF6600] w-3.5 h-3.5"
                />
                <span className="text-[11px] sm:text-xs">আলোচনা সাপেক্ষে</span>
              </label>
            </div>
          </div>

          {/* Section 5: Seller Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                আপনার নাম *
              </label>
              <input
                type="text"
                required
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                ফোন নম্বর *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0A1128] mb-1 text-xs">
                WhatsApp নম্বর *
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>
          </div>

          {/* Section 6: Compact Image Upload Area (h-32) */}
          <div>
            <label className="block font-bold text-[#0A1128] mb-1 text-xs">
              পণ্যের ছবিসমূহ (গ্যালারি)
            </label>
            
            <div className="border-2 border-dashed border-gray-300 hover:border-[#FF6600] rounded-2xl h-32 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/80 p-3">
              <label className="cursor-pointer block w-full h-full flex flex-col items-center justify-center">
                <Camera className="w-7 h-7 text-[#FF6600] mb-1" />
                <span className="text-xs sm:text-sm font-bold text-[#0A1128] block">
                  ছবি নির্বাচন করতে এখানে ক্লিক করুন
                </span>
                <span className="text-[11px] text-gray-500 block">
                  কম্প্যাক্ট আপলোড • সর্বোচ্চ ৫টি ছবি সংযুক্ত করুন
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 shrink-0 shadow-2xs">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 7: PREMIUM PROMOTION PACKAGES (Ref: image_2ea006.png) */}
          {!editingAd && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block font-black text-[#0A1128] text-xs sm:text-base uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF6600]" />
                  <span>বিজ্ঞাপন প্রমোশন প্যাকেজ নির্বাচন করুন</span>
                </label>
                <span className="text-xs font-bold text-gray-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                  ক্যাটাগরি: {category}
                </span>
              </div>

              {/* Promo Cards matching image_2ea006.png */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* 1. Free */}
                <div
                  onClick={() => setSelectedPromo('free')}
                  className={`border rounded-2xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
                    selectedPromo === 'free'
                      ? 'border-[#0A1128] bg-slate-50 ring-2 ring-[#0A1128]/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-700">ফ্রি বিজ্ঞাপন</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">Standard</span>
                    </div>
                    <p className="text-lg font-black text-[#0A1128] mb-1">৳০</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      সাধারণ লিস্টিং, কোনো স্পেশাল ব্যাজ নেই
                    </p>
                  </div>
                  <div className="mt-3 text-right">
                    <span className={`inline-block w-4 h-4 rounded-full border ${selectedPromo === 'free' ? 'bg-[#0A1128] border-[#0A1128]' : 'border-gray-300'}`}></span>
                  </div>
                </div>

                {/* 2. Top Ad 7 Days */}
                <div
                  onClick={() => setSelectedPromo('top_7')}
                  className={`border rounded-2xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
                    selectedPromo === 'top_7'
                      ? 'border-[#FF6600] bg-orange-50/50 ring-2 ring-[#FF6600]/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-800">Top Ad (৭ দিন)</span>
                      <span className="text-[10px] bg-orange-100 text-[#FF6600] px-1.5 py-0.5 rounded font-bold">Popular</span>
                    </div>
                    <p className="text-lg font-black text-[#FF6600] mb-1">৳{currentPricing.top7}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      ৭ দিন ক্যাটাগরির শীর্ষে থাকবে এবং ৩ গুণ বেশি ভিউ পাবেন
                    </p>
                  </div>
                  <div className="mt-3 text-right">
                    <span className={`inline-block w-4 h-4 rounded-full border ${selectedPromo === 'top_7' ? 'bg-[#FF6600] border-[#FF6600]' : 'border-gray-300'}`}></span>
                  </div>
                </div>

                {/* 3. Top Ad 30 Days */}
                <div
                  onClick={() => setSelectedPromo('top_30')}
                  className={`border rounded-2xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
                    selectedPromo === 'top_30'
                      ? 'border-[#FF6600] bg-orange-50/50 ring-2 ring-[#FF6600]/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-800">Top Ad (৩০ দিন)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Best Value</span>
                    </div>
                    <p className="text-lg font-black text-[#FF6600] mb-1">৳{currentPricing.top30}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      পুরো ১ মাস টপ ফিচারে থাকবে ও ৫ গুণ দ্রুত বিক্রয় হবে
                    </p>
                  </div>
                  <div className="mt-3 text-right">
                    <span className={`inline-block w-4 h-4 rounded-full border ${selectedPromo === 'top_30' ? 'bg-[#FF6600] border-[#FF6600]' : 'border-gray-300'}`}></span>
                  </div>
                </div>

                {/* 4. Boost 1 Month */}
                <div
                  onClick={() => setSelectedPromo('boost_month')}
                  className={`border rounded-2xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
                    selectedPromo === 'boost_month'
                      ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-purple-900">Boost (১ মাস)</span>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">VIP</span>
                    </div>
                    <p className="text-lg font-black text-purple-700 mb-1">৳{currentPricing.boostMonth}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      হোমপেজ ব্যানার + টপ প্লেসমেন্ট + গোল্ডেন ব্যাজ
                    </p>
                  </div>
                  <div className="mt-3 text-right">
                    <span className={`inline-block w-4 h-4 rounded-full border ${selectedPromo === 'boost_month' ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}></span>
                  </div>
                </div>
              </div>

              {/* Dynamic Notification on Package Choice */}
              {selectedPromo !== 'free' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF6600] text-white flex items-center justify-center font-bold">
                      ৳
                    </div>
                    <div>
                      <p className="font-bold text-[#0A1128]">
                        নির্বাচিত প্যাকেজ: {calculatePackageDetails()?.name} (৳{calculatePackageDetails()?.price})
                      </p>
                      <p className="text-[11px] text-gray-600">
                        নিচের বাটনে ক্লিক করলে সরাসরি বিকাশ/নগদ পেমেন্ট ভেরিফিকেশন গেটওয়েতে নিয়ে যাওয়া হবে।
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-submit-post-ad"
              className="bg-[#0A1128] hover:bg-black disabled:bg-gray-400 text-white font-black text-xs sm:text-sm px-8 py-3 rounded-2xl shadow-lg shadow-gray-400/30 transition cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>প্রসেসিং হচ্ছে...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#FF6600]" />
                  <span>
                    {editingAd
                      ? 'বিজ্ঞাপন আপডেট করুন'
                      : selectedPromo !== 'free'
                      ? `বিজ্ঞাপন পোস্ট ও পেমেন্ট করুন (৳${calculatePackageDetails()?.price})`
                      : 'বিজ্ঞাপন প্রকাশ করুন (ফ্রি)'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
