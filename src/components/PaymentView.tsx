import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Loader2, 
  PhoneCall, 
  HelpCircle,
  Sparkles,
  Zap,
  Flame,
  Award
} from 'lucide-react';
import { Ad, SubscriptionPackage, UserProfile } from '../types';
import { submitPaymentVerification, savePaymentTransaction, updateFirestoreAd } from '../lib/firebase';
import { toBengaliNumber } from './AdCard';

interface PaymentViewProps {
  ad: Ad;
  packageDetails: {
    id: string;
    name: string;
    days: number;
    amount: number;
  };
  currentUser: UserProfile | null;
  bkashNumber?: string;
  nagadNumber?: string;
  bkashLogoUrl?: string | null;
  nagadLogoUrl?: string | null;
  onPaymentSubmitted: (ad: Ad) => void;
  onCancel: () => void;
}

export const PaymentView: React.FC<PaymentViewProps> = ({
  ad,
  packageDetails,
  currentUser,
  bkashNumber = '01956629330',
  nagadNumber = '01956629330',
  bkashLogoUrl,
  nagadLogoUrl,
  onPaymentSubmitted,
  onCancel
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderNumber, setSenderNumber] = useState(currentUser?.phoneNumber || currentUser?.phone || '');
  const [trxId, setTrxId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifiedSubmitted, setIsVerifiedSubmitted] = useState(false);

  const DEFAULT_BKASH_LOGO = 'https://1000logos.net/wp-content/uploads/2021/02/Bikash-logo.png';
  const DEFAULT_NAGAD_LOGO = 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png';

  const currentBkashLogo = bkashLogoUrl || DEFAULT_BKASH_LOGO;
  const currentNagadLogo = nagadLogoUrl || DEFAULT_NAGAD_LOGO;

  const receivingNumber = paymentMethod === 'bkash' ? bkashNumber : nagadNumber;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!senderNumber.trim()) {
      setErrorMessage('অনুগ্রহ করে যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।');
      return;
    }

    if (!trxId.trim()) {
      setErrorMessage('অনুগ্রহ করে পেমেন্টের Transaction ID (TrxID) প্রদান করুন।');
      return;
    }

    if (trxId.trim().length < 4) {
      setErrorMessage('সঠিক Transaction ID দিন (কমপক্ষে ৪ বা ততোধিক অক্ষর/সংখ্যা)।');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit payment verification to 'pending_payments' in Firestore
      const verificationResult = await submitPaymentVerification(
        currentUser?.uid,
        paymentMethod,
        packageDetails.amount,
        trxId,
        {
          adId: ad.id,
          adTitle: ad.title,
          userName: currentUser?.displayName || currentUser?.name || ad.sellerName || 'ব্যবহারকারী',
          userPhone: senderNumber.trim(),
          senderNumber: senderNumber.trim(),
          packageId: packageDetails.id,
          packageName: packageDetails.name,
          packageDays: packageDetails.days
        }
      );

      if (!verificationResult.success) {
        setErrorMessage(verificationResult.error || 'পেমেন্ট ভেরিফিকেশন অনুরোধ পাঠানো ব্যর্থ হয়েছে।');
        setIsSubmitting(false);
        return;
      }

      // 2. Record payment transaction in Firestore
      const trxIdStr = verificationResult.docId || ('trx-' + Date.now());
      const nowIso = new Date().toISOString();
      await savePaymentTransaction({
        id: trxIdStr,
        adId: ad.id,
        adTitle: ad.title,
        userId: currentUser?.uid,
        userName: currentUser?.displayName || currentUser?.name || ad.sellerName || 'ব্যবহারকারী',
        userPhone: senderNumber.trim(),
        packageId: packageDetails.id,
        packageName: packageDetails.name,
        packageDays: packageDetails.days,
        amount: packageDetails.amount,
        paymentMethod,
        senderNumber: senderNumber.trim(),
        trxId: trxId.trim().toUpperCase(),
        status: 'pending',
        createdAt: nowIso
      });

      // 3. Update Ad status in Firestore to 'pending' with payment details
      const updatedAd: Ad = {
        ...ad,
        status: 'pending', // In-review status: strictly hidden from public until admin approves
        packageId: packageDetails.id,
        packageName: packageDetails.name,
        packageDays: packageDetails.days,
        paymentStatus: 'pending',
        paymentTrxId: trxId.trim().toUpperCase(),
        paymentMethod
      };

      await updateFirestoreAd(ad.id, {
        status: 'pending',
        packageId: packageDetails.id,
        packageName: packageDetails.name,
        packageDays: packageDetails.days,
        paymentStatus: 'pending',
        paymentTrxId: trxId.trim().toUpperCase(),
        paymentMethod
      });

      setIsVerifiedSubmitted(true);
      onPaymentSubmitted(updatedAd);
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setErrorMessage(err.message || 'পেমেন্ট তথ্য সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  // 6.6 Verification State Screen
  if (isVerifiedSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
              অ্যাডমিন ভেরিফিকেশন চলছে (In-Review)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0A1128]">
              পেমেন্ট তথ্য সফলভাবে জমা হয়েছে!
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              আপনার পেমেন্ট Transaction ID (<span className="font-mono font-bold text-[#0A1128]">{trxId.toUpperCase()}</span>) অ্যাডমিন পর্যালোচনায় রয়েছে। অ্যাডমিন ভেরিফাই করার সাথে সাথেই বিজ্ঞাপনটি ওয়েবসাইটে হাইলাইট হয়ে যাবে।
            </p>
          </div>

          {/* Ad & Package Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-gray-200 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-500">বিজ্ঞাপনের শিরোনাম:</span>
              <span className="font-black text-[#0A1128] truncate max-w-[200px]">{ad.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-500">নির্বাচিত প্যাকেজ:</span>
              <span className="font-bold text-[#FF6600]">{packageDetails.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-500">পেমেন্ট মেথড:</span>
              <span className="font-bold uppercase text-[#0A1128]">{paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center pt-1 font-bold text-sm">
              <span className="text-gray-700">পরিশোধিত মূল্য:</span>
              <span className="text-[#0A1128]">৳{toBengaliNumber(packageDetails.amount)}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-[#0A1128] hover:bg-black text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>আমার বিজ্ঞাপনসমূহে ফিরে যান</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-5">
        
        {/* Back and Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-[#0A1128] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>বিজ্ঞাপন এডিটে ফিরে যান</span>
          </button>
          <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            নিরাপদ পেমেন্ট গেটওয়ে
          </span>
        </div>

        {/* Selected Package Header Card */}
        <div className="bg-[#0A1128] text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-[#FF6600]/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF6600] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                নির্বাচিত প্রমোশনাল প্যাকেজ
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {packageDetails.name}
              </h1>
              <p className="text-xs text-gray-300 mt-0.5 truncate max-w-md">
                বিজ্ঞাপন: <span className="font-semibold text-white">{ad.title}</span>
              </p>
            </div>

            <div className="text-left sm:text-right bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xs border border-white/10 shrink-0">
              <span className="text-[11px] text-gray-300 block">মোট পরিশোধযোগ্য মূল্য:</span>
              <span className="text-2xl sm:text-3xl font-black text-[#FF6600]">
                ৳{toBengaliNumber(packageDetails.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Gateway Selection */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-xs space-y-6">
          
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-black text-[#0A1128]">
              পেমেন্ট মাধ্যম নির্বাচন করুন
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              আপনার পছন্দের ওয়ালেট (bKash অথবা Nagad) নির্বাচন করে Send Money করুন।
            </p>
          </div>

          {/* Gateway Tabs with Exact Required Logos */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* bKash Option */}
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('bkash');
                setErrorMessage('');
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                paymentMethod === 'bkash'
                  ? 'border-[#E2136E] bg-pink-50/50 shadow-md shadow-pink-100 ring-2 ring-[#E2136E]/20'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <img
                src={currentBkashLogo}
                alt="bKash"
                className="h-9 sm:h-11 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_BKASH_LOGO;
                }}
              />
              <span className={`text-xs font-black ${paymentMethod === 'bkash' ? 'text-[#E2136E]' : 'text-gray-700'}`}>
                বিকাশ (bKash)
              </span>
            </button>

            {/* Nagad Option */}
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('nagad');
                setErrorMessage('');
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                paymentMethod === 'nagad'
                  ? 'border-[#F7941D] bg-orange-50/50 shadow-md shadow-orange-100 ring-2 ring-[#F7941D]/20'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <img
                src={currentNagadLogo}
                alt="Nagad"
                className="h-9 sm:h-11 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_NAGAD_LOGO;
                }}
              />
              <span className={`text-xs font-black ${paymentMethod === 'nagad' ? 'text-[#F7941D]' : 'text-gray-700'}`}>
                নগদ (Nagad)
              </span>
            </button>

          </div>

          {/* Payment Instructions Box (Replicating image_3a016c.png & image_3a0439.png) */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            paymentMethod === 'bkash' ? 'bg-pink-50/60 border-pink-200' : 'bg-orange-50/60 border-orange-200'
          } space-y-4`}>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#0A1128] uppercase flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${paymentMethod === 'bkash' ? 'bg-[#E2136E]' : 'bg-[#F7941D]'}`}></span>
                {paymentMethod === 'bkash' ? 'বিকাশ Send Money নম্বর' : 'নগদ Send Money নম্বর'}
              </span>
              <span className="text-[11px] font-bold text-gray-500">Personal / Agent</span>
            </div>

            {/* Admin Receiving Number Display & Copy Button */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-gray-300 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className={`w-4 h-4 ${paymentMethod === 'bkash' ? 'text-[#E2136E]' : 'text-[#F7941D]'}`} />
                <span className="font-mono text-base sm:text-lg font-black text-[#0A1128] tracking-wide">
                  {receivingNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(receivingNumber)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#0A1128] font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5 text-gray-600" />
                <span>{copiedNumber === receivingNumber ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-1.5 text-xs text-gray-700">
              <p className="font-bold text-[#0A1128]">পেমেন্ট করার নিয়মাবলী:</p>
              <ol className="list-decimal list-inside space-y-1 font-medium pl-1 text-[11px] sm:text-xs">
                <li>আপনার {paymentMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} অ্যাপে যান অথবা ডায়াল করুন ({paymentMethod === 'bkash' ? '*247#' : '*167#'})।</li>
                <li><strong className="text-[#0A1128]">"Send Money"</strong> অপশন সিলেক্ট করুন।</li>
                <li>প্রাপক নম্বরে উপরের কপি করা নম্বরটি (<strong className="font-mono">{receivingNumber}</strong>) দিন।</li>
                <li>টাকার পরিমাণ লিখুন: <strong className="text-[#FF6600]">৳{packageDetails.amount}</strong>।</li>
                <li>পেমেন্ট সম্পন্ন হওয়ার পর প্রাপ্ত <strong className="text-[#0A1128]">Transaction ID (TrxID)</strong> নিচের বক্সে লিখে সাবমিট করুন।</li>
              </ol>
            </div>

          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Sender Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1.5">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন: <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] transition"
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1.5">
                  Transaction ID (TrxID): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  placeholder="যেমন: BKI9821X90"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-[#0A1128] uppercase focus:bg-white focus:outline-none focus:border-[#FF6600] transition"
                />
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-payment-trx"
                className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>পেমেন্ট যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Transaction ID জমা দিন ও বিজ্ঞাপন সম্পন্ন করুন</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
