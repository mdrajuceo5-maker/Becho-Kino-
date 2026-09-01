import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  LogIn,
  UserPlus
} from 'lucide-react';
import {
  signInWithGoogle,
  registerWithPhoneAndPass,
  loginWithPhoneOrEmail
} from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, message: string) => void;
  initialMode?: 'login' | 'register';
  isRedirectedFromPostAd?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  isRedirectedFromPostAd = false
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Registration and Login states
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // phone or email
  const [password, setPassword] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsLoading(false);
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await signInWithGoogle();
      if (!user) {
        // User voluntarily dismissed/closed the Google popup
        setIsLoading(false);
        return;
      }
      const userProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || 'ব্যবহারকারী',
        displayName: user.displayName || 'ব্যবহারকারী',
        email: user.email,
        phone: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      onSuccess(userProfile, `স্বাগতম, ${user.displayName || 'সম্মানিত ব্যবহারকারী'}! Google দিয়ে সফলভাবে লগইন হয়েছে।`);
      onClose();
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed popup
      } else {
        setErrorMessage(error.message || 'Google দিয়ে লগইনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Manual Login (Phone or Email + Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('অনুগ্রহ করে মোবাইল নম্বর/ইমেইল এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const profile = await loginWithPhoneOrEmail(identifier.trim(), password);
      onSuccess(profile, `স্বাগতম, ${profile.displayName || profile.name}! সফলভাবে লগইন হয়েছে।`);
      onClose();
    } catch (error: any) {
      console.error('Login Error:', error);
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential'
      ) {
        setErrorMessage('মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। দয়া করে পরীক্ষা করুন।');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('সঠিক মোবাইল নম্বর অথবা ইমেইল লিখুন।');
      } else {
        setErrorMessage(error.message || 'লগইন ব্যর্থ হয়েছে।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Simple Manual Registration (Name + Phone + Password)
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
      return;
    }
    if (!identifier.trim()) {
      setErrorMessage('অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const profile = await registerWithPhoneAndPass(name.trim(), identifier.trim(), password);
      onSuccess(profile, `অভিনন্দন, ${profile.displayName || profile.name}! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।`);
      onClose();
    } catch (error: any) {
      console.error('Registration Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('এই নম্বর বা ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। দয়া করে লগইন করুন।');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের শক্তিশালী হতে হবে।');
      } else {
        setErrorMessage(error.message || 'রেজিস্ট্রেশন সম্পূর্ণ করা সম্ভব হয়নি।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 max-w-[100vw]">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200/90 flex flex-col my-auto box-border">
        
        {/* Header with Navy & Orange branding */}
        <div className="bg-[#0A1128] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF6600] flex items-center justify-center text-white font-black text-sm shadow-sm">
              BK
            </div>
            <div>
              <h2 className="font-black text-base text-white leading-tight">
                {mode === 'login' ? 'BechoKino-তে লগইন' : 'ফ্রি অ্যাকাউন্ট রেজিস্ট্রেশন'}
              </h2>
              <p className="text-[11px] text-gray-300">
                {isRedirectedFromPostAd ? 'বিজ্ঞাপন পোস্ট করতে সাইন ইন করুন' : 'ক্রয় বিক্রয়ের বিশ্বস্ত প্ল্যাটফর্ম'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-auth-modal"
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh] box-border space-y-4">
          
          {/* Post-Ad redirect banner info */}
          {isRedirectedFromPostAd && (
            <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#0A1128]">
              <Sparkles className="w-4 h-4 text-[#FF6600] shrink-0 mt-0.5" />
              <p className="leading-snug">
                বিজ্ঞাপন দেওয়ার জন্য লগইন বা রেজিস্ট্রেশন করুন। লগইন সম্পন্ন হওয়ামাত্র সরাসরি বিজ্ঞাপন ফর্মে নিয়ে যাওয়া হবে।
              </p>
            </div>
          )}

          {/* Mode Switch Tabs (Login / Register) */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              id="tab-auth-login"
              className={`py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#0A1128] shadow-xs'
                  : 'text-gray-500 hover:text-[#0A1128]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF6600]" />
              <span>লগইন</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              id="tab-auth-register"
              className={`py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#0A1128] shadow-xs'
                  : 'text-gray-500 hover:text-[#0A1128]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#FF6600]" />
              <span>রেজিস্ট্রেশন</span>
            </button>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in break-words">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* 100% Working Google One-Click Login */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            id="btn-google-signin"
            className="w-full bg-white hover:bg-slate-50 border-2 border-gray-200 hover:border-gray-300 text-[#0A1128] font-bold py-2.5 sm:py-3 px-4 rounded-2xl flex items-center justify-center gap-3 text-xs sm:text-sm shadow-2xs transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google দিয়ে সরাসরি সাইন ইন</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-gray-400 font-bold uppercase tracking-wider shrink-0">
              অথবা
            </span>
            <div className="border-t border-gray-200 w-full" />
          </div>

          {/* FORM: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1">
                  মোবাইল নম্বর অথবা ইমেইল:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1">
                  পাসওয়ার্ড:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                id="btn-submit-login"
                className="w-full mt-2 bg-[#FF6600] hover:bg-[#e65c00] text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md shadow-orange-200/80 transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>প্রসেসিং হচ্ছে...</span>
                ) : (
                  <>
                    <span>লগইন করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  অ্যাকাউন্ট নেই?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage('');
                    }}
                    className="text-[#FF6600] font-black hover:underline cursor-pointer"
                  >
                    নতুন অ্যাকাউন্ট তৈরি করুন
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORM: REGISTRATION (Name + Phone + Password, No OTP) */}
          {mode === 'register' && (
            <form onSubmit={handleRegistration} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1">
                  আপনার নাম:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1">
                  মোবাইল নম্বর:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A1128] mb-1">
                  পাসওয়ার্ড:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:bg-white focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                id="btn-submit-register"
                className="w-full mt-2 bg-[#FF6600] hover:bg-[#e65c00] text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md shadow-orange-200/80 transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                ) : (
                  <>
                    <span>ফ্রি রেজিস্ট্রেশন সম্পন্ন করুন</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                    }}
                    className="text-[#FF6600] font-black hover:underline cursor-pointer"
                  >
                    লগইন করুন
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Security footnote */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>BechoKino.com • নিরাপদ ও স্থায়ী ক্লাউড ডাটাবেজ</span>
          </div>

        </div>

      </div>
    </div>
  );
};
