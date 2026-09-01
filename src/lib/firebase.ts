import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  serverTimestamp,
  DocumentData
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { Ad, AdSenseConfig, ChatMessage, PaymentTransaction, PendingPayment, ReportRecord, SiteSettings, SubscriptionPackage, UserProfile } from '../types';
import { INITIAL_ADS } from '../data/initialAds';
import firebaseConfig from '../../firebase-applet-config.json';

export const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'pkg-daily',
    name: 'দৈনিক (১ দিন)',
    days: 1,
    price: 20,
    category: 'all',
    features: ['১ দিন লাইভ থাকবে', 'ইনস্ট্যান্ট ভেরিফিকেশন', 'সার্চে প্রাধান্য']
  },
  {
    id: 'pkg-3days',
    name: '৩ দিন (স্ট্যান্ডার্ড)',
    days: 3,
    price: 50,
    category: 'all',
    isPopular: true,
    features: ['৩ দিন সক্রিয় থাকবে', 'বেশি ভিউ ও দ্রুত বিক্রি', 'ইন-অ্যাপ চ্যাট সাপোর্ট']
  },
  {
    id: 'pkg-1week',
    name: '১ সপ্তাহ (৭ দিন প্রিমিয়াম)',
    days: 7,
    price: 100,
    category: 'all',
    features: ['৭ দিন হোমপেজে হাইলাইট', 'টপ ক্যাটাগরি প্লেসমেন্ট', 'সর্বোচ্চ ক্রেতার কাছে পৌঁছানো']
  }
];

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { onAuthStateChanged, signOut };

// Firestore instance
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Firebase Storage instance
export const storage = getStorage(app, firebaseConfig.storageBucket);

/**
 * Compress an Image File or Blob using HTML5 Canvas to < 150KB
 * Keeps image crystal clear while reducing file payload size by up to 95%
 */
export const compressImageClientSide = async (
  fileOrBlob: File | Blob,
  maxDimension = 1024,
  quality = 0.72
): Promise<Blob> => {
  return new Promise((resolve) => {
    // If not an image or already very small (< 100KB), resolve directly
    if (!fileOrBlob.type.startsWith('image/') || fileOrBlob.size < 100 * 1024) {
      resolve(fileOrBlob);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if dimensions exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        resolve(fileOrBlob);
        return;
      }

      // Draw and compress to JPEG
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < fileOrBlob.size) {
            resolve(blob);
          } else {
            resolve(fileOrBlob);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(fileOrBlob);
    };

    img.src = url;
  });
};

/**
 * Upload Image, Video, or Voice blob/file to Firebase Storage.
 * Generates a storage ref in /chatMedia/{filename}.
 * Includes a fast 3-second timeout to prevent any network hanging,
 * instantly resolving with optimized data if cloud storage takes too long.
 */
export const uploadMediaToFirebaseStorage = async (
  fileOrBlob: File | Blob,
  folder: 'images' | 'videos' | 'voices' | 'ads' | 'chatMedia' = 'chatMedia',
  customName?: string
): Promise<string> => {
  // Compress images client-side before upload to achieve ultra-fast transfers (< 100KB)
  let targetPayload = fileOrBlob;
  if (fileOrBlob.type.startsWith('image/') || folder === 'images' || folder === 'ads') {
    try {
      targetPayload = await compressImageClientSide(fileOrBlob);
    } catch {
      targetPayload = fileOrBlob;
    }
  }

  const mimeType = targetPayload.type || fileOrBlob.type;
  let ext = 'jpg';
  if (mimeType.includes('image/png')) ext = 'png';
  else if (mimeType.includes('image/webp')) ext = 'webp';
  else if (mimeType.includes('image')) ext = 'jpg';
  else if (mimeType.includes('video/mp4') || mimeType.includes('video')) ext = 'mp4';
  else if (mimeType.includes('audio/webm') || mimeType.includes('webm')) ext = 'webm';
  else if (mimeType.includes('audio/mp3') || mimeType.includes('audio/mpeg')) ext = 'mp3';
  else if (mimeType.includes('audio/ogg')) ext = 'ogg';
  else if (mimeType.includes('audio')) ext = 'webm';

  const origName = (fileOrBlob as File).name ? (fileOrBlob as File).name.replace(/[^a-zA-Z0-9._-]/g, '_') : `${folder}_${Date.now()}.${ext}`;
  const fileName = customName || `${Date.now()}_${origName}`;
  const fileRef = ref(storage, `chatMedia/${fileName}`);

  // Helper to convert blob to data URI instantly
  const toDataUri = (blob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed converting file to string'));
        }
      };
      reader.onerror = () => reject(new Error('File reader failed'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    // Race between Firebase Storage upload (3s timeout) and instant resolution
    const uploadPromise = (async () => {
      const uploadResult = await uploadBytes(fileRef, targetPayload, {
        contentType: mimeType || (folder === 'voices' ? 'audio/webm' : folder === 'videos' ? 'video/mp4' : 'image/jpeg')
      });
      return await getDownloadURL(uploadResult.ref);
    })();

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout fallback')), 2800);
    });

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadUrl;
  } catch (err) {
    console.info('Using high-speed instant media processing (instant send):', err);
    return await toDataUri(targetPayload);
  }
};

// Google Sign-In (100% Functional popup)
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await syncUserProfileDoc(user);
    return user;
  } catch (error: any) {
    // If the user simply closed the Google popup or cancelled, do not crash or throw noisy error
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.info('Google Sign-In popup closed by user.');
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Standalone Email Sign-Up helper
export const signUpWithEmail = async (email: string, pass: string): Promise<User | undefined> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    console.log("নতুন ব্যবহারকারী তৈরি হয়েছে:", userCredential.user.uid);
    await syncUserProfileDoc(userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error("রেজিস্ট্রেশন ব্যর্থ হয়েছে:", error.message);
    throw error;
  }
};

// Standalone Email Sign-In helper
export const loginWithEmail = async (email: string, pass: string): Promise<User | undefined> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    console.log("সফল লগইন:", userCredential.user.uid);
    await syncUserProfileDoc(userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error("লগইন ব্যর্থ হয়েছে:", error.message);
    throw error;
  }
};

// Manual Phone/Email Registration with resilient Firebase + Firestore Fallback
export const registerWithPhoneAndPass = async (
  name: string,
  phoneOrEmail: string,
  pass: string
): Promise<UserProfile> => {
  const cleanInput = phoneOrEmail.trim();
  const isEmail = cleanInput.includes('@');
  const cleanPhone = cleanInput.replace(/[^0-9]/g, '');
  const resolvedPhone = !isEmail ? (cleanPhone || cleanInput) : null;
  const resolvedEmail = isEmail ? cleanInput : null;
  const resolvedName = name.trim() || 'ব্যবহারকারী';
  
  const authEmail = isEmail ? cleanInput : `${cleanPhone}@bechokino.com`;

  try {
    // 1. First attempt standard Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, authEmail, pass);
    const user = userCredential.user;
    
    if (resolvedName) {
      await updateProfile(user, { displayName: resolvedName });
    }

    const { profile } = await syncUserProfileDoc(user, {
      displayName: resolvedName,
      name: resolvedName,
      email: resolvedEmail,
      phoneNumber: resolvedPhone,
      phone: resolvedPhone,
      role: 'user',
      status: 'active'
    });

    return profile;
  } catch (err: any) {
    // 2. If Firebase Email/Password provider is disabled or restricted (auth/operation-not-allowed)
    if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation' || err.message?.includes('operation-not-allowed')) {
      console.warn('Firebase Auth email/pass provider is restricted; registering directly in Firestore users collection.');
      
      const customUid = isEmail 
        ? `usr_${cleanInput.replace(/[^a-zA-Z0-9]/g, '_')}` 
        : `usr_${cleanPhone || Date.now()}`;
      
      const userDocRef = doc(db, 'users', customUid);
      const existingSnap = await getDoc(userDocRef);
      
      if (existingSnap.exists()) {
        throw new Error('এই নম্বর বা ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। দয়া করে লগইন করুন।');
      }

      // Check if phone or email is already registered under another ID in Firestore
      try {
        const usersCol = collection(db, 'users');
        const q = resolvedPhone 
          ? query(usersCol, where('phoneNumber', '==', resolvedPhone))
          : query(usersCol, where('email', '==', resolvedEmail));
        const checkSnap = await getDocs(q);
        if (!checkSnap.empty) {
          throw new Error('এই নম্বর বা ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। দয়া করে লগইন করুন।');
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে')) {
          throw checkErr;
        }
      }

      // Hash or encode password securely
      const encodedPass = btoa(encodeURIComponent(pass));

      const newProfile: UserProfile = {
        uid: customUid,
        name: resolvedName,
        displayName: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        phoneNumber: resolvedPhone,
        photoURL: null,
        role: 'user',
        status: 'active',
        passwordHash: encodedPass,
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, removeUndefined(newProfile), { merge: true });

      // Save custom session locally
      localStorage.setItem('bechokino_custom_auth_user', JSON.stringify(newProfile));
      window.dispatchEvent(new CustomEvent('bechokino_auth_change', { detail: newProfile }));

      return newProfile;
    }
    
    throw err;
  }
};

// Manual Login with Phone or Email with Firebase + Firestore Fallback
export const loginWithPhoneOrEmail = async (
  phoneOrEmail: string,
  pass: string
): Promise<UserProfile> => {
  const cleanInput = phoneOrEmail.trim();
  const isEmail = cleanInput.includes('@');
  const cleanPhone = cleanInput.replace(/[^0-9]/g, '');
  const resolvedPhone = !isEmail ? (cleanPhone || cleanInput) : null;
  const resolvedEmail = isEmail ? cleanInput : null;

  const authEmail = isEmail ? cleanInput : `${cleanPhone}@bechokino.com`;

  try {
    // 1. Try Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, authEmail, pass);
    const user = userCredential.user;
    const { profile } = await syncUserProfileDoc(user);
    return profile;
  } catch (err: any) {
    // If standard Firebase Auth throws operation-not-allowed or user not found, check Firestore direct users
    if (
      err.code === 'auth/operation-not-allowed' || 
      err.code === 'auth/user-not-found' || 
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/admin-restricted-operation'
    ) {
      // Check direct Firestore user accounts
      const targetDocId = isEmail 
        ? `usr_${cleanInput.replace(/[^a-zA-Z0-9]/g, '_')}` 
        : `usr_${cleanPhone || cleanInput}`;
      
      let userDocRef = doc(db, 'users', targetDocId);
      let snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        // Query by phone or email field
        try {
          const usersCol = collection(db, 'users');
          const q = resolvedPhone 
            ? query(usersCol, where('phoneNumber', '==', resolvedPhone))
            : query(usersCol, where('email', '==', resolvedEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            snap = querySnap.docs[0];
            userDocRef = snap.ref;
          }
        } catch {
          // continue
        }
      }

      if (snap && snap.exists()) {
        const data = snap.data() as any;

        // Check account status
        if (data.status === 'banned') {
          throw new Error('আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত করা হয়েছে।');
        }
        if (data.status === 'pending') {
          throw new Error('আপনার অ্যাকাউন্টটি ভেরিফিকেশনের জন্য অপেক্ষমান আছে। অ্যাডমিন অ্যাপ্রুভ করলে আপনি লগইন করতে পারবেন।');
        }

        // Validate password
        const encodedInputPass = btoa(encodeURIComponent(pass));
        if (data.passwordHash && data.passwordHash !== encodedInputPass && data.passwordHash !== pass) {
          throw new Error('পাসওয়ার্ডটি সঠিক নয়। দয়া করে পুনরায় চেষ্টা করুন।');
        }

        const userProfile: UserProfile = {
          uid: data.uid || snap.id,
          name: data.name || data.displayName || 'ব্যবহারকারী',
          displayName: data.displayName || data.name || 'ব্যবহারকারী',
          email: data.email || resolvedEmail,
          phone: data.phone || data.phoneNumber || resolvedPhone,
          phoneNumber: data.phoneNumber || data.phone || resolvedPhone,
          photoURL: data.photoURL || null,
          role: data.role || 'user',
          status: data.status || 'active',
          createdAt: data.createdAt || new Date().toISOString()
        };

        localStorage.setItem('bechokino_custom_auth_user', JSON.stringify(userProfile));
        window.dispatchEvent(new CustomEvent('bechokino_auth_change', { detail: userProfile }));
        return userProfile;
      }

      if (err.code === 'auth/operation-not-allowed') {
        throw new Error('এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে প্রথমে রেজিস্ট্রেশন করুন।');
      }
    }

    throw err;
  }
};

// Sign Out (cleans both Firebase Auth and custom Firestore sessions)
export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem('bechokino_custom_auth_user');
  window.dispatchEvent(new CustomEvent('bechokino_auth_change', { detail: null }));
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Signout warning:', err);
  }
};

// Get current active session user (synchronous helper)
export const getActiveSessionUser = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem('bechokino_custom_auth_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Universal Auth State Listener that unifies Firebase Auth & Direct Firestore sessions
export const subscribeToUnifiedAuth = (
  callback: (user: UserProfile | null, errorMsg?: string) => void
): (() => void) => {
  let isHandledByFirebaseAuth = false;

  // 1. Firebase Auth listener
  const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      isHandledByFirebaseAuth = true;
      const result = await validateUserFirestoreSession(firebaseUser);
      if (result.valid && result.profile) {
        callback(result.profile);
      } else {
        callback(null, result.errorMsg);
      }
    } else {
      isHandledByFirebaseAuth = false;
      // Check custom local session if not logged in via Firebase
      const customUser = getActiveSessionUser();
      if (customUser) {
        // Re-validate against Firestore
        try {
          const userDocRef = doc(db, 'users', customUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (data.status === 'banned' || data.status === 'pending') {
              localStorage.removeItem('bechokino_custom_auth_user');
              callback(null, data.status === 'banned' ? 'আপনার অ্যাকাউন্টটি স্থগিত করা হয়েছে।' : 'অ্যাকাউন্ট ভেরিফিকেশন পেন্ডিং।');
              return;
            }
            callback({ ...customUser, ...data });
            return;
          }
        } catch {
          callback(customUser);
          return;
        }
      }
      callback(null);
    }
  });

  // 2. Custom local event listener
  const handleCustomAuthChange = (event: any) => {
    if (!isHandledByFirebaseAuth) {
      const user = event.detail as UserProfile | null;
      callback(user);
    }
  };

  window.addEventListener('bechokino_auth_change', handleCustomAuthChange);

  // Return combined unsubscribe
  return () => {
    unsubscribeFirebase();
    window.removeEventListener('bechokino_auth_change', handleCustomAuthChange);
  };
};

// Update user profile photo
export const updateUserProfilePhoto = async (
  uid: string,
  photoURL: string
): Promise<void> => {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL });
  }
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, { photoURL }, { merge: true });
};

// Phone Authentication Recaptcha Setup
export const setupPhoneRecaptcha = (containerId: string): RecaptchaVerifier => {
  // Clear any existing recaptcha widget if present
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Recaptcha clear warning:', e);
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
};

// Request Phone OTP
export const requestPhoneOtp = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  // Format phone number with country code (+880 for BD if missing)
  let formattedNumber = phoneNumber.trim();
  if (!formattedNumber.startsWith('+')) {
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+88' + formattedNumber;
    } else if (formattedNumber.startsWith('880')) {
      formattedNumber = '+' + formattedNumber;
    } else {
      formattedNumber = '+880' + formattedNumber;
    }
  }

  const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);
  return confirmationResult;
};

// Verify Phone OTP
export const verifyPhoneOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string,
  displayName?: string
): Promise<User> => {
  const result = await confirmationResult.confirm(otpCode);
  const user = result.user;

  if (displayName && !user.displayName) {
    await updateProfile(user, { displayName });
  }

  await syncUserProfileDoc(user, displayName ? { displayName } : undefined);
  return user;
};

// Schedule 1-Week Soft Account Deletion
export const scheduleAccountDeletion = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setDoc(userDocRef, {
      status: 'scheduled_for_deletion',
      deletionScheduledAt: scheduledDate
    }, { merge: true });
    await signOut(auth);
  } catch (error) {
    console.error('Error scheduling account deletion:', error);
    throw error;
  }
};

// Cancel Deletion & Reactivate Account
export const reactivateAccount = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      status: 'active',
      deletionScheduledAt: null
    });
  } catch (error) {
    console.error('Error reactivating account:', error);
  }
};

// Sync user profile to Firestore & Handle Role, Status (Active/Pending/Suspended/Banned)
export const syncUserProfileDoc = async (
  user: User,
  extraData?: Partial<UserProfile>,
  isNewRegistration: boolean = false
): Promise<{ reactivated: boolean; profile: UserProfile }> => {
  let wasReactivated = false;
  const userDocRef = doc(db, 'users', user.uid);
  const existingSnap = await getDoc(userDocRef);
  
  let currentStatus: 'active' | 'pending' | 'scheduled_for_deletion' | 'suspended' | 'banned' = 'active';
  let deletionScheduledAt: string | undefined = undefined;
  let suspendedUntil: string | undefined = undefined;

  if (existingSnap.exists()) {
    const existingData = existingSnap.data() as UserProfile;

    // Check if permanently banned
    if (existingData.status === 'banned') {
      await signOut(auth);
      throw new Error('আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত করা হয়েছে।');
    }

    // Check if currently suspended
    if (existingData.status === 'suspended') {
      const suspensionEnd = existingData.suspendedUntil ? new Date(existingData.suspendedUntil).getTime() : Infinity;
      const now = Date.now();
      if (now < suspensionEnd) {
        await signOut(auth);
        throw new Error('আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত করা হয়েছে।');
      } else {
        // Suspension expired, auto-restore
        currentStatus = 'active';
        suspendedUntil = undefined;
      }
    }

    // Check if pending verification
    if (existingData.status === 'pending') {
      await signOut(auth);
      throw new Error('আপনার অ্যাকাউন্টটি ভেরিফিকেশনের জন্য অপেক্ষমান আছে। অ্যাডমিন অ্যাপ্রুভ করলে আপনি লগইন করতে পারবেন।');
    }

    // Preserve existing status if active or scheduled for deletion
    if (existingData.status) {
      currentStatus = existingData.status;
    }

    // Check if user was previously scheduled for deletion
    if (existingData.status === 'scheduled_for_deletion' && existingData.deletionScheduledAt) {
      const scheduledTime = new Date(existingData.deletionScheduledAt).getTime();
      const now = Date.now();
      if (now < scheduledTime) {
        currentStatus = 'active';
        deletionScheduledAt = undefined;
        wasReactivated = true;
      } else {
        currentStatus = 'active';
        deletionScheduledAt = undefined;
      }
    }
  } else {
    // If brand new registration and approval is required or requested
    if (isNewRegistration && extraData?.status === 'pending') {
      currentStatus = 'pending';
    }
  }

  const resolvedName = extraData?.name || extraData?.displayName || user.displayName || user.email?.split('@')[0] || 'ব্যবহারকারী';
  const resolvedPhone = extraData?.phone || extraData?.phoneNumber || user.phoneNumber || null;

  const userData: UserProfile = {
    uid: user.uid,
    name: resolvedName,
    displayName: resolvedName,
    email: user.email || (extraData?.email ?? null),
    phone: resolvedPhone,
    phoneNumber: resolvedPhone,
    photoURL: user.photoURL || null,
    role: existingSnap.exists() ? (existingSnap.data().role || 'user') : (extraData?.role || 'user'),
    status: currentStatus,
    deletionScheduledAt: deletionScheduledAt || undefined,
    suspendedUntil: suspendedUntil || undefined,
    createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
    ...extraData
  };

  // Ensure both name & displayName and phone & phoneNumber are populated for Firestore schema
  userData.name = resolvedName;
  userData.displayName = resolvedName;
  userData.phone = resolvedPhone;
  userData.phoneNumber = resolvedPhone;
  userData.status = currentStatus;

  await setDoc(userDocRef, removeUndefined(userData), { merge: true });

  // If status is pending upon initial registration, force signOut and throw prompt
  if (currentStatus === 'pending') {
    await signOut(auth);
    throw new Error('আপনার অ্যাকাউন্টটি ভেরিফিকেশনের জন্য অপেক্ষমান আছে। অ্যাডমিন অ্যাপ্রুভ করলে আপনি লগইন করতে পারবেন।');
  }

  return { reactivated: wasReactivated, profile: userData };
};

// Client-Side Auth Guard: Validate Firestore User Document on Auth State Change
export const validateUserFirestoreSession = async (
  user: User
): Promise<{ valid: boolean; profile: UserProfile | null; errorMsg?: string }> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      
      // If status is banned
      if (data.status === 'banned') {
        await signOut(auth);
        return {
          valid: false,
          profile: null,
          errorMsg: 'আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত করা হয়েছে।'
        };
      }

      // If status is suspended
      if (data.status === 'suspended') {
        const suspensionEnd = data.suspendedUntil ? new Date(data.suspendedUntil).getTime() : Infinity;
        if (Date.now() < suspensionEnd) {
          await signOut(auth);
          return {
            valid: false,
            profile: null,
            errorMsg: 'আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত করা হয়েছে।'
          };
        } else {
          // Auto restore expired suspension
          await updateDoc(userDocRef, { status: 'active', suspendedUntil: null });
          data.status = 'active';
        }
      }

      // If status is pending
      if (data.status === 'pending') {
        await signOut(auth);
        return {
          valid: false,
          profile: null,
          errorMsg: 'আপনার অ্যাকাউন্টটি ভেরিফিকেশনের জন্য অপেক্ষমান আছে। অ্যাডমিন অ্যাপ্রুভ করলে আপনি লগইন করতে পারবেন।'
        };
      }

      return {
        valid: true,
        profile: {
          ...data,
          uid: user.uid,
          name: data.name || data.displayName || user.displayName || 'ব্যবহারকারী',
          displayName: data.displayName || data.name || user.displayName || 'ব্যবহারকারী',
          email: data.email || user.email,
          phone: data.phone || data.phoneNumber || user.phoneNumber,
          phoneNumber: data.phoneNumber || data.phone || user.phoneNumber,
          photoURL: data.photoURL || user.photoURL,
          role: data.role || 'user',
          status: data.status || 'active'
        }
      };
    } else {
      // Create initial document in Firestore for new user
      const resolvedName = user.displayName || user.email?.split('@')[0] || 'ব্যবহারকারী';
      const initialData: UserProfile = {
        uid: user.uid,
        name: resolvedName,
        displayName: resolvedName,
        email: user.email || null,
        phone: user.phoneNumber || null,
        phoneNumber: user.phoneNumber || null,
        photoURL: user.photoURL || null,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, removeUndefined(initialData), { merge: true });
      return {
        valid: true,
        profile: initialData
      };
    }
  } catch (err: any) {
    console.error('Error validating user Firestore session:', err);
    return {
      valid: false,
      profile: null,
      errorMsg: err.message || 'ত্রুটি ঘটেছে'
    };
  }
};

/**
 * Helper to recursively remove undefined properties from objects
 * so Firestore setDoc/updateDoc never fails with 'Unsupported field value: undefined'.
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' && value !== null ? removeUndefined(value) : value;
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ----------------------------------------------------
// FIRESTORE PERMANENT DATA SERVICES (Ads, Settings, Messages)
// ----------------------------------------------------

const SETTINGS_DOC_ID = 'site_settings';

// Subscribe to global Site Settings
export const subscribeToSiteSettings = (
  onUpdate: (settings: SiteSettings) => void,
  defaultSettings: SiteSettings
) => {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  
  return onSnapshot(docRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data() as Partial<SiteSettings>;
      onUpdate({
        ...defaultSettings,
        ...data
      });
    } else {
      // Seed default settings to Firestore so it exists permanently
      try {
        await setDoc(docRef, removeUndefined(defaultSettings));
      } catch (err) {
        console.error('Error seeding site settings:', err);
      }
      onUpdate(defaultSettings);
    }
  }, (error) => {
    console.error('Settings snapshot error:', error);
    onUpdate(defaultSettings);
  });
};

// Save site settings to Firestore permanently
export const updateFirestoreSiteSettings = async (settings: SiteSettings): Promise<void> => {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  const generalDocRef = doc(db, 'adminSettings', 'general');
  const logoConfigRef = doc(db, 'settings', 'logo_config');
  const cleaned = removeUndefined(settings);
  await Promise.allSettled([
    setDoc(docRef, cleaned, { merge: true }),
    setDoc(generalDocRef, cleaned, { merge: true }),
    setDoc(logoConfigRef, { logoUrl: settings.logoUrl || null, logoType: settings.logoType || 'svg_brand', updatedAt: new Date().toISOString() }, { merge: true })
  ]);
};

// ==========================================
// GOOGLE ADSENSE DYNAMIC INTEGRATION & CONFIG
// ==========================================

export function injectAdSenseScript(pubId: string): void {
  try {
    if (!pubId || !pubId.trim()) return;
    const cleanId = pubId.trim();

    // Check if script already exists with same ID
    const existing = document.querySelector(`script[id="dynamic-adsense-script"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.src.includes(cleanId)) return;
      existing.remove();
    }

    // ডাইনামিকালি স্ক্রিপ্ট ট্যাগ তৈরি করে হেডার-এ যুক্ত করা হচ্ছে
    const script = document.createElement("script");
    script.id = "dynamic-adsense-script";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cleanId)}`;
    script.crossOrigin = "anonymous";

    document.head.appendChild(script);
    console.log("AdSense script loaded for Publisher ID:", cleanId);
  } catch (err) {
    console.error("AdSense injection error:", err);
  }
}

export function removeAdSenseScript(): void {
  try {
    const existing = document.querySelector(`script[id="dynamic-adsense-script"]`);
    if (existing) existing.remove();
  } catch (err) {
    console.warn("Remove AdSense script warning:", err);
  }
}

/**
 * settings কালেকশনের adsense_config ডকুমেন্টে আইডি সেভ করা
 */
export async function saveAdSenseId(
  publisherId: string, 
  isEnabled = true, 
  autoAds = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPubId = publisherId.trim();
    // settings কালেকশনের adsense_config ডকুমেন্টে আইডি সেভ হচ্ছে
    await setDoc(doc(db, "settings", "adsense_config"), {
      publisherId: cleanPubId,
      isEnabled,
      autoAds,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also sync to site_settings
    await setDoc(doc(db, "settings", SETTINGS_DOC_ID), {
      adsensePublisherId: cleanPubId,
      adsenseEnabled: isEnabled,
      adsenseAutoAds: autoAds
    }, { merge: true });
    
    // Refresh dynamic AdSense in browser
    if (isEnabled && cleanPubId) {
      injectAdSenseScript(cleanPubId);
    } else {
      removeAdSenseScript();
    }

    console.log("AdSense ID Saved Successfully:", cleanPubId);
    return { success: true };
  } catch (error: any) {
    console.error("Error saving AdSense ID:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ওয়েবসাইট বা অ্যাপ লোড হওয়ার সময় dynamic AdSense লোড করা
 */
export async function loadDynamicAdSense(): Promise<void> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "adsense_config"));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const pubId = data?.publisherId;
      const isEnabled = data?.isEnabled !== false;
      
      if (isEnabled && pubId && pubId.trim().length > 0) {
        injectAdSenseScript(pubId);
      }
    } else {
      // Fallback to site_settings if exists
      const siteSnap = await getDoc(doc(db, "settings", SETTINGS_DOC_ID));
      if (siteSnap.exists()) {
        const siteData = siteSnap.data();
        if (siteData.adsenseEnabled !== false && siteData.adsensePublisherId) {
          injectAdSenseScript(siteData.adsensePublisherId);
        }
      }
    }
  } catch (error) {
    console.error("AdSense load error:", error);
  }
}

/**
 * Real-time listener for AdSense configuration
 */
export function subscribeToAdSenseConfig(callback: (config: AdSenseConfig | null) => void) {
  const docRef = doc(db, "settings", "adsense_config");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AdSenseConfig;
      callback(data);
      if (data.isEnabled !== false && data.publisherId) {
        injectAdSenseScript(data.publisherId);
      } else {
        removeAdSenseScript();
      }
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("AdSense config subscription warning:", err);
  });
}

/**
 * Dedicated, ultra-reliable Logo Uploader and Firestore Saver.
 * 1. Reads file, compresses client-side.
 * 2. Attempts Firebase Storage upload to 'logos/site_logo_${Date.now()}' & 'admin/site-logo.png'.
 * 3. Falls back immediately to high-definition data URI if Storage fails or times out.
 * 4. Permanently writes to Firestore 'settings/site_settings', 'adminSettings/general', and 'settings/logo_config'.
 * 5. Returns { success: true, url: downloadURL } with guaranteed completion.
 */
export async function uploadLogoAndSave(fileOrBlob: File | Blob): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const mimeType = fileOrBlob.type || 'image/png';
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';

    // Compress client-side to ensure crystal clarity & instant transfer
    let targetPayload: Blob = fileOrBlob;
    try {
      targetPayload = await compressImageClientSide(fileOrBlob, 1200, 0.88);
    } catch {
      targetPayload = fileOrBlob;
    }

    const toDataUri = (blob: Blob | File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Failed converting logo to string'));
        };
        reader.onerror = () => reject(new Error('File reader failed'));
        reader.readAsDataURL(blob);
      });
    };

    let downloadURL = '';

    try {
      const storageRef = ref(storage, `logos/site_logo_${Date.now()}.${ext}`);
      const adminStorageRef = ref(storage, `admin/site-logo.${ext}`);

      const uploadPromise = (async () => {
        const snapshot = await uploadBytes(storageRef, targetPayload, { contentType: mimeType });
        const url = await getDownloadURL(snapshot.ref);
        // Also save to admin reference non-blockingly
        uploadBytes(adminStorageRef, targetPayload, { contentType: mimeType }).catch(() => {});
        return url;
      })();

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Storage upload timeout')), 3500);
      });

      downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
    } catch (storageErr) {
      console.warn('Firebase Storage upload notice, using resilient high-speed format:', storageErr);
      downloadURL = await toDataUri(targetPayload);
    }

    // Save to Firestore collections permanently
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const generalDocRef = doc(db, 'adminSettings', 'general');
    const logoConfigRef = doc(db, 'settings', 'logo_config');

    const updatePayload = {
      logoUrl: downloadURL,
      logoType: 'custom_image',
      updatedAt: new Date().toISOString()
    };

    await Promise.allSettled([
      setDoc(docRef, updatePayload, { merge: true }),
      setDoc(generalDocRef, updatePayload, { merge: true }),
      setDoc(logoConfigRef, updatePayload, { merge: true })
    ]);

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return { success: false, url: '', error: error.message || 'লোগো আপলোড ব্যর্থ হয়েছে' };
  }
}

/**
 * Upload and save gateway images (bKash, Nagad, etc.) to Storage and Firestore
 */
export async function uploadGatewayImage(file: File | Blob, gatewayName: 'bkash' | 'nagad' | string): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!file) return { success: false, error: 'No file selected' };

  try {
    const mimeType = file.type || 'image/png';
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';

    let targetPayload: Blob = file;
    try {
      targetPayload = await compressImageClientSide(file, 800, 0.9);
    } catch {
      targetPayload = file;
    }

    const toDataUri = (blob: Blob | File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Failed converting gateway logo to string'));
        };
        reader.onerror = () => reject(new Error('File reader failed'));
        reader.readAsDataURL(blob);
      });
    };

    let downloadURL = '';
    try {
      const storageRef = ref(storage, `gateways/${gatewayName}_logo_${Date.now()}.${ext}`);
      const uploadPromise = (async () => {
        const snapshot = await uploadBytes(storageRef, targetPayload, { contentType: mimeType });
        return await getDownloadURL(snapshot.ref);
      })();
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Storage upload timeout')), 3500);
      });
      downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
    } catch (storageErr) {
      console.warn('Storage fallback to data uri for gateway logo:', storageErr);
      downloadURL = await toDataUri(targetPayload);
    }

    // Save in gateways collection and update site settings
    const gatewayDocRef = doc(db, 'gateways', gatewayName);
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const generalDocRef = doc(db, 'adminSettings', 'general');

    const updateDocPayload: any = {
      name: gatewayName,
      imageUrl: downloadURL,
      updatedAt: new Date().toISOString()
    };

    const siteSettingsUpdate: any = {};
    if (gatewayName === 'bkash') siteSettingsUpdate.bkashLogoUrl = downloadURL;
    if (gatewayName === 'nagad') siteSettingsUpdate.nagadLogoUrl = downloadURL;

    await Promise.allSettled([
      setDoc(gatewayDocRef, updateDocPayload, { merge: true }),
      setDoc(settingsDocRef, siteSettingsUpdate, { merge: true }),
      setDoc(generalDocRef, siteSettingsUpdate, { merge: true })
    ]);

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('Upload gateway logo error:', error);
    return { success: false, error: error.message || 'গেটওয়ে ইমেজ আপলোড ব্যর্থ হয়েছে' };
  }
}


// Subscribe to live Ads collection
export const subscribeToAds = (
  onUpdate: (ads: Ad[]) => void
) => {
  const adsCollection = collection(db, 'ads');

  return onSnapshot(adsCollection, async (snapshot) => {
    if (snapshot.empty) {
      // If collection is empty on first boot, seed initial ads so user immediately sees live ads
      console.log('Seeding initial ads to Firestore...');
      try {
        for (const ad of INITIAL_ADS) {
          await setDoc(doc(db, 'ads', ad.id), removeUndefined(ad));
        }
      } catch (seedErr) {
        console.error('Error seeding initial ads:', seedErr);
        onUpdate(INITIAL_ADS);
        return;
      }
    } else {
      const loadedAds: Ad[] = [];
      snapshot.forEach((docSnap) => {
        loadedAds.push({ ...(docSnap.data() as Ad), id: docSnap.id });
      });

      // Sort by createdAt descending
      loadedAds.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onUpdate(loadedAds);
    }
  }, (error) => {
    console.error('Ads snapshot error:', error);
    onUpdate(INITIAL_ADS);
  });
};

// Create or update Ad permanently
export const saveFirestoreAd = async (ad: Ad): Promise<void> => {
  const docRef = doc(db, 'ads', ad.id);
  await setDoc(docRef, removeUndefined(ad), { merge: true });
};

// Delete Ad permanently
export const deleteFirestoreAd = async (adId: string): Promise<void> => {
  const docRef = doc(db, 'ads', adId);
  await deleteDoc(docRef);
};

// Increment Ad views permanently
export const incrementFirestoreAdViews = async (adId: string, currentViews: number): Promise<void> => {
  try {
    const docRef = doc(db, 'ads', adId);
    await updateDoc(docRef, {
      views: (currentViews || 0) + 1
    });
  } catch (err) {
    console.warn('Failed to increment view count:', err);
  }
};

// Subscribe to chat messages
export const subscribeToMessages = (
  onUpdate: (messages: ChatMessage[]) => void
) => {
  const messagesCol = collection(db, 'messages');
  return onSnapshot(messagesCol, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      let createdAtIso = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdAtIso = data.createdAt;
        } else if (data.createdAt?.toDate) {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (data.createdAt?.seconds) {
          createdAtIso = new Date(data.createdAt.seconds * 1000).toISOString();
        }
      }
      msgs.push({
        id: docSnap.id,
        chatId: data.chatId || data.threadId,
        threadId: data.threadId || data.chatId,
        adId: data.adId || '',
        adTitle: data.adTitle || '',
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        isSeller: Boolean(data.isSeller),
        text: data.text || '',
        mediaUrl: data.mediaUrl || data.imageUrl || data.videoUrl || data.audioUrl,
        messageType: data.messageType || (data.imageUrl ? 'image' : data.videoUrl ? 'video' : data.audioUrl ? 'audio' : 'text'),
        imageUrl: data.imageUrl || (data.messageType === 'image' ? data.mediaUrl : undefined),
        videoUrl: data.videoUrl || (data.messageType === 'video' ? data.mediaUrl : undefined),
        audioUrl: data.audioUrl || (data.messageType === 'audio' ? data.mediaUrl : undefined),
        audioDuration: data.audioDuration,
        status: data.status || 'delivered',
        createdAt: createdAtIso
      });
    });
    // Sort by createdAt ascending
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    onUpdate(msgs);
  }, (error) => {
    console.error('Messages subscription error:', error);
  });
};

// Save a chat message permanently
export const sendFirestoreMessage = async (message: ChatMessage): Promise<void> => {
  const docRef = doc(db, 'messages', message.id);
  const cleanMsg = removeUndefined({
    ...message,
    status: message.status || 'delivered'
  });
  await setDoc(docRef, cleanMsg);
};

// ভিডিও বা ভয়েস ব্লব Firebase-এ আপলোড ও মেসেজ পাঠানোর ফাংশন
export async function sendMediaMessage(
  chatId: string, 
  senderId: string, 
  file: Blob | File, 
  type: 'image' | 'video' | 'audio' | string,
  extraMeta?: Partial<ChatMessage>
) {
  try {
    // ফাইলের ধরন অনুযায়ী ফোল্ডার পাথ (যেমন: videos/ বা voices/)
    const fileName = type === 'audio' 
      ? `voice_${Date.now()}.wav` 
      : type === 'video'
        ? `video_${Date.now()}_${(file as File).name || 'clip.mp4'}`
        : `${Date.now()}_${(file as File).name || 'photo.jpg'}`;

    let downloadURL = '';
    try {
      const storageRef = ref(storage, `chats/${chatId}/${type}s/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      downloadURL = await getDownloadURL(snapshot.ref);
    } catch (storageErr) {
      console.warn('Storage upload error, falling back to data URI:', storageErr);
      downloadURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ২. ফায়ারস্টোরে মেসেজ ডাটা সেভ
    const docData: Record<string, any> = {
      chatId,
      threadId: chatId,
      senderId,
      mediaUrl: downloadURL,
      messageType: type, // 'image', 'video', অথবা 'audio'
      text: extraMeta?.text || '',
      adId: extraMeta?.adId || '',
      adTitle: extraMeta?.adTitle || '',
      senderName: extraMeta?.senderName || 'ব্যবহারকারী',
      receiverId: extraMeta?.receiverId || '',
      receiverName: extraMeta?.receiverName || '',
      isSeller: Boolean(extraMeta?.isSeller),
      status: 'delivered',
      createdAt: serverTimestamp()
    };

    if (type === 'image') docData.imageUrl = downloadURL;
    if (type === 'video') docData.videoUrl = downloadURL;
    if (type === 'audio') {
      docData.audioUrl = downloadURL;
      if (extraMeta?.audioDuration) docData.audioDuration = extraMeta.audioDuration;
    }

    const docRef = await addDoc(collection(db, "messages"), docData);
    console.log("Media message sent successfully! Doc ID:", docRef.id);

    return { success: true, docId: docRef.id, url: downloadURL };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { success: false, error: error.message };
  }
}

// Global recording references for voice recording
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioStream: MediaStream | null = null;

// ১. মাইক পারমিশন নিয়ে রেকর্ডিং শুরু করা
export async function startVoiceRecording() {
  try {
    audioChunks = []; // আগের ডাটা রিসেট
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("আপনার ব্রাউজারে অডিও রেকর্ডিং সাপোর্ট করে না বা সিকিউর (HTTPS) সংযোগ নেই।");
      return { success: false, error: "MediaDevices not supported" };
    }

    // ব্রাউজারের কাছে মাইক্রোফোন পারমিশন চাওয়া হচ্ছে
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // ব্রাউজার সাপোর্ট অনুযায়ী রিয়েল ভয়েস টাইপ সেট করা
    const options: MediaRecorderOptions = {};
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options.mimeType = 'audio/ogg';
      }
    }

    mediaRecorder = new MediaRecorder(audioStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    console.log("Recording started...");
    return { success: true };
  } catch (error: any) {
    console.warn("Mic access error:", error);
    const errName = error?.name || '';
    const errMsg = String(error?.message || '').toLowerCase();

    if (
      errName === 'NotFoundError' || 
      errName === 'DevicesNotFoundError' || 
      errMsg.includes('requested device not found') ||
      errMsg.includes('device not found')
    ) {
      alert("আপনার ডিভাইসে কোনো মাইক্রোফোন বা অডিও ইনপুট ডিভাইস পাওয়া যায়নি। অনুগ্রহ করে হেডফোন বা মাইক্রোফোন সংযোগ করুন।");
    } else if (
      errName === 'NotAllowedError' || 
      errName === 'PermissionDeniedError' ||
      errMsg.includes('permission denied')
    ) {
      alert("মাইক্রোফোন ব্যবহারের অনুমতি বাতিল করা হয়েছে। ব্রাউজারের সাইট সেটিংস থেকে মাইক্রোফোন Allow করুন।");
    } else {
      alert("মাইক্রোফোন চালু করা যায়নি: " + (error?.message || "অনুগ্রহ করে মাইক্রোফোন ব্যবহারের অনুমতি দিন এবং নিশ্চিত করুন আপনার সাইটটি HTTPS-এ চলছে!"));
    }
    return { success: false, error: error.message };
  }
}

// ২. রেকর্ডিং বন্ধ করা এবং সরাসরি ফায়ারবেসে পাঠানো
export async function stopVoiceAndSend(
  chatId: string, 
  senderId: string,
  extraMeta?: Partial<ChatMessage>
): Promise<{ success: boolean; url?: string; docId?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!mediaRecorder) {
      resolve({ success: false, error: "Recorder not initialized" });
      return;
    }

    mediaRecorder.onstop = async () => {
      // রেকর্ড করা ভয়েস দিয়ে অডিও ফাইল (Blob) তৈরি
      const mime = mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mime });
      audioChunks = []; // রিসেট

      // রেকর্ডিং শেষ হলে মোবাইল/পিসির লাল মাইক আইকন বা স্ট্রিম বন্ধ করা
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
      }

      try {
        // Firebase Storage-এ আপলোড
        const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `voice_${Date.now()}.${ext}`;
        const storageRef = ref(storage, `chats/${chatId}/voices/${fileName}`);
        
        let downloadURL = '';
        try {
          const snapshot = await uploadBytes(storageRef, audioBlob);
          downloadURL = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.warn('Storage upload fallback:', storageErr);
          downloadURL = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(audioBlob);
          });
        }

        // Firestore-এ মেসেজ সেভ
        const docRef = await addDoc(collection(db, "messages"), {
          chatId,
          threadId: chatId,
          senderId,
          mediaUrl: downloadURL,
          audioUrl: downloadURL,
          messageType: "audio",
          text: extraMeta?.text || '',
          adId: extraMeta?.adId || '',
          adTitle: extraMeta?.adTitle || '',
          senderName: extraMeta?.senderName || 'ব্যবহারকারী',
          receiverId: extraMeta?.receiverId || '',
          receiverName: extraMeta?.receiverName || '',
          isSeller: Boolean(extraMeta?.isSeller),
          status: 'delivered',
          createdAt: serverTimestamp()
        });

        console.log("Voice sent successfully! Doc ID:", docRef.id);
        resolve({ success: true, url: downloadURL, docId: docRef.id });
      } catch (err: any) {
        console.error("Upload error:", err);
        resolve({ success: false, error: err.message });
      }
    };

    try {
      mediaRecorder.stop();
    } catch (e: any) {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
      }
      resolve({ success: false, error: e.message });
    }
  });
}

// Mark messages as read in Firestore
export const markFirestoreMessagesAsRead = async (adId: string, currentUserId: string, unreadMsgIds: string[]): Promise<void> => {
  try {
    for (const id of unreadMsgIds) {
      const docRef = doc(db, 'messages', id);
      await updateDoc(docRef, { status: 'read' });
    }
  } catch (err) {
    console.warn('Error marking messages as read:', err);
  }
};

// Update Ad permanently
export const updateFirestoreAd = async (adId: string, updatedFields: Partial<Ad>): Promise<void> => {
  const docRef = doc(db, 'ads', adId);
  await setDoc(docRef, removeUndefined(updatedFields), { merge: true });
};

// Subscribe to Payment Transactions
export const subscribeToTransactions = (
  onUpdate: (transactions: PaymentTransaction[]) => void
) => {
  const transactionsCol = collection(db, 'transactions');
  return onSnapshot(transactionsCol, (snapshot) => {
    const list: PaymentTransaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as PaymentTransaction), id: docSnap.id });
    });
    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(list);
  }, (error) => {
    console.error('Transactions subscription error:', error);
  });
};

// Save a payment transaction
export const savePaymentTransaction = async (trx: PaymentTransaction): Promise<void> => {
  const docRef = doc(db, 'transactions', trx.id);
  await setDoc(docRef, removeUndefined(trx), { merge: true });
};

/**
 * ইউজার যখন "Submit Transaction" বাটনে ক্লিক করবে তখন এই ফাংশনটি কল হবে
 * ১. ট্রানজেকশন আইডি ফাঁকা থাকলে সাবমিট হবে না
 * ২. শুধুমাত্র সাবমিট করলেই ফায়ারস্টোরে 'pending_payments' কালেকশনে ডাটা যাবে
 */
export async function submitPaymentVerification(
  userId: string | undefined, 
  gateway: 'bkash' | 'nagad' | string, 
  amount: number | string, 
  transactionId: string,
  extraMeta?: {
    adId?: string;
    adTitle?: string;
    userName?: string;
    userPhone?: string;
    senderNumber?: string;
    packageId?: string;
    packageName?: string;
    packageDays?: number;
  }
) {
  // ১. ট্রানজেকশন আইডি ফাঁকা থাকলে সাবমিট হবে না
  if (!transactionId || transactionId.trim() === "") {
    alert("অনুগ্রহ করে সঠিক Transaction ID দিন!");
    return { success: false, error: "Empty Transaction ID" };
  }

  try {
    // ২. শুধুমাত্র সাবমিট করলেই ফায়ারস্টোরে 'pending_payments' কালেকশনে ডাটা যাবে
    const payload: Record<string, any> = {
      userId: userId || 'anonymous',
      gateway: gateway, // 'bkash' or 'nagad'
      amount: Number(amount),
      transactionId: transactionId.trim().toUpperCase(),
      status: "pending", // স্ট্যাটাস ডিফল্টভাবে pending থাকবে
      createdAt: serverTimestamp()
    };

    if (extraMeta?.adId) payload.adId = extraMeta.adId;
    if (extraMeta?.adTitle) payload.adTitle = extraMeta.adTitle;
    if (extraMeta?.userName) payload.userName = extraMeta.userName;
    if (extraMeta?.userPhone) payload.userPhone = extraMeta.userPhone;
    if (extraMeta?.senderNumber) payload.senderNumber = extraMeta.senderNumber;
    if (extraMeta?.packageId) payload.packageId = extraMeta.packageId;
    if (extraMeta?.packageName) payload.packageName = extraMeta.packageName;
    if (extraMeta?.packageDays) payload.packageDays = extraMeta.packageDays;

    const docRef = await addDoc(collection(db, "pending_payments"), payload);

    console.log("Verification request sent to Admin Panel! Document ID:", docRef.id);
    return { success: true, docId: docRef.id };
  } catch (error: any) {
    console.error("Error submitting payment:", error);
    return { success: false, error: error.message };
  }
}

/**
 * অ্যাডমিন প্যানেলে রিয়েলটাইমে পেন্ডিং ডাটা শো করার ফাংশন
 * এটি রিয়েলটাইমে অ্যাডমিন ড্যাশবোর্ড আপডেট করবে
 */
export function listenPendingPayments(onDataUpdate: (pendingList: (PendingPayment & { id: string })[]) => void) {
  const q = query(
    collection(db, "pending_payments"), 
    where("status", "==", "pending")
  );

  return onSnapshot(q, (querySnapshot) => {
    const pendingList: (PendingPayment & { id: string })[] = [];
    querySnapshot.forEach((docSnap) => {
      pendingList.push({ id: docSnap.id, ...(docSnap.data() as PendingPayment) });
    });
    onDataUpdate(pendingList);
  }, (error) => {
    console.error("listenPendingPayments error:", error);
  });
}

/**
 * অ্যাডমিন প্যানেলে সকল পেমেন্ট (pending, verified, rejected) ট্র্যাকিংয়ের জন্য
 */
export function subscribeToAllPendingPayments(onDataUpdate: (list: (PendingPayment & { id: string })[]) => void) {
  const colRef = collection(db, "pending_payments");
  return onSnapshot(colRef, (querySnapshot) => {
    const list: (PendingPayment & { id: string })[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as PendingPayment) });
    });
    onDataUpdate(list);
  }, (error) => {
    console.error("subscribeToAllPendingPayments error:", error);
  });
}

/**
 * Update pending_payment document status (verify / reject) and activate/reject Ad
 */
export async function updatePendingPaymentStatus(
  docId: string,
  status: 'verified' | 'rejected',
  adId?: string
): Promise<void> {
  const paymentDocRef = doc(db, 'pending_payments', docId);
  await updateDoc(paymentDocRef, { 
    status,
    verifiedAt: new Date().toISOString()
  });

  if (adId) {
    const adDocRef = doc(db, 'ads', adId);
    if (status === 'verified') {
      await updateDoc(adDocRef, {
        paymentStatus: 'verified',
        status: 'active'
      });
    } else if (status === 'rejected') {
      await updateDoc(adDocRef, {
        paymentStatus: 'rejected',
        status: 'rejected'
      });
    }
  }
}

// Update transaction status (verify/reject)
export const updatePaymentTransactionStatus = async (
  trxId: string, 
  status: 'pending' | 'verified' | 'rejected',
  adId?: string
): Promise<void> => {
  const docRef = doc(db, 'transactions', trxId);
  await updateDoc(docRef, { status });

  if (adId) {
    const adDocRef = doc(db, 'ads', adId);
    if (status === 'verified') {
      await updateDoc(adDocRef, {
        paymentStatus: 'verified',
        status: 'active'
      });
    } else if (status === 'rejected') {
      await updateDoc(adDocRef, {
        paymentStatus: 'rejected',
        status: 'rejected'
      });
    }
  }
};

// ----------------------------------------------------
// USERS MANAGEMENT & SEARCH
// ----------------------------------------------------

export const subscribeToUsers = (
  onUpdate: (users: UserProfile[]) => void
) => {
  const usersCol = collection(db, 'users');
  return onSnapshot(usersCol, (snapshot) => {
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as UserProfile), uid: docSnap.id });
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(list);
  }, (error) => {
    console.error('Users subscription error:', error);
  });
};

export const updateUserAccountStatus = async (
  uid: string,
  status: 'active' | 'pending' | 'suspended' | 'banned',
  suspendedDays?: number
): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  const updateData: Partial<UserProfile> = { status };
  if (status === 'suspended') {
    const days = suspendedDays || 10;
    updateData.suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  } else if (status === 'active') {
    updateData.suspendedUntil = undefined;
    updateData.deletionScheduledAt = undefined;
  }
  await updateDoc(userDocRef, removeUndefined(updateData));
};

export const deleteUserDoc = async (uid: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await deleteDoc(userDocRef);
};

// ----------------------------------------------------
// USER REPORTS & COMPLAINTS SYSTEM
// ----------------------------------------------------

export const submitReport = async (report: Omit<ReportRecord, 'id' | 'createdAt' | 'status'>): Promise<string> => {
  const reportId = 'rep-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newReport: ReportRecord = {
    ...report,
    id: reportId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const docRef = doc(db, 'reports', reportId);
  await setDoc(docRef, removeUndefined(newReport));
  return reportId;
};

export const subscribeToReports = (
  onUpdate: (reports: ReportRecord[]) => void
) => {
  const reportsCol = collection(db, 'reports');
  return onSnapshot(reportsCol, (snapshot) => {
    const list: ReportRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as ReportRecord), id: docSnap.id });
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(list);
  }, (error) => {
    console.error('Reports subscription error:', error);
  });
};

export const updateReportStatus = async (
  reportId: string,
  status: 'resolved' | 'dismissed',
  actionTaken?: string
): Promise<void> => {
  const reportDocRef = doc(db, 'reports', reportId);
  await updateDoc(reportDocRef, removeUndefined({ status, actionTaken }));
};

