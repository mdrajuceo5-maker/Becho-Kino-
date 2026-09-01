import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  CheckCheck, 
  Film, 
  Image as ImageIcon, 
  MessageCircle, 
  Mic, 
  Play, 
  Send, 
  Square, 
  Trash2, 
  User, 
  Video, 
  X,
  Loader2,
  Flag,
  Share2,
  AlertCircle,
  Clock,
  Search
} from 'lucide-react';
import { Ad, ChatMessage, ChatThread, UserProfile } from '../types';
import { 
  markFirestoreMessagesAsRead, 
  sendFirestoreMessage, 
  subscribeToMessages, 
  uploadMediaToFirebaseStorage,
  compressImageClientSide,
  submitReport,
  sendMediaMessage,
  startVoiceRecording,
  stopVoiceAndSend
} from '../lib/firebase';
import { AudioVoiceMessage } from './AudioVoiceMessage';
import { useLanguage } from '../context/LanguageContext';

interface ChatInboxViewProps {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
  onOpenPostAd: () => void;
  currentUser?: UserProfile | null;
  initialAdId?: string | null;
  onThreadStateChange?: (inThread: boolean) => void;
}

export const ChatInboxView: React.FC<ChatInboxViewProps> = ({
  ads,
  onSelectAd,
  onOpenPostAd,
  currentUser,
  initialAdId,
  onThreadStateChange
}) => {
  const { t, language } = useLanguage();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Media Files & Previews
  const [chatImageFile, setChatImageFile] = useState<File | Blob | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [chatVideoFile, setChatVideoFile] = useState<File | null>(null);
  const [chatVideoPreview, setChatVideoPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Active selected thread state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [inThread, setInThread] = useState<boolean>(Boolean(initialAdId));

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('প্রতারণা বা ভুয়া বিজ্ঞাপন');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState('');

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioUrlPreview, setAudioUrlPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const myUid = currentUser?.uid || 'guest_user';

  // Subscribe to real-time Firestore messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((msgs) => {
      setChatMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Compute conversation threads from all messages and accessible ads
  const threads = useMemo<ChatThread[]>(() => {
    const threadMap = new Map<string, ChatThread>();

    // 1. Group existing messages into threads
    chatMessages.forEach((msg) => {
      const relatedAd = ads.find((a) => a.id === msg.adId);
      const sellerId = relatedAd?.userId || (msg.isSeller ? msg.senderId : msg.receiverId || 'seller');
      const buyerId = msg.isSeller ? (msg.receiverId || 'buyer') : msg.senderId;
      const threadId = msg.threadId || `${msg.adId}_${buyerId}_${sellerId}`;

      // Only include threads where current user is the buyer, seller, or sender/receiver
      const isParticipant = !currentUser || 
        currentUser.uid === buyerId || 
        currentUser.uid === sellerId || 
        currentUser.uid === msg.senderId || 
        currentUser.uid === msg.receiverId;

      if (!isParticipant && currentUser?.role !== 'admin') {
        return;
      }

      const existing = threadMap.get(threadId);
      const msgTime = new Date(msg.createdAt).getTime();

      if (!existing || msgTime > new Date(existing.lastMessageTime).getTime()) {
        const isUnread = msg.senderId !== myUid && msg.status !== 'read';
        const unreadCount = (existing?.unreadCount || 0) + (isUnread ? 1 : 0);

        threadMap.set(threadId, {
          id: threadId,
          adId: msg.adId,
          adTitle: msg.adTitle || relatedAd?.title || 'বিজ্ঞাপন',
          adImage: relatedAd?.images?.[0] || '',
          adPrice: relatedAd?.price,
          buyerId,
          buyerName: msg.isSeller ? (msg.receiverName || 'ক্রেতা') : msg.senderName,
          sellerId,
          sellerName: relatedAd?.sellerName || (msg.isSeller ? msg.senderName : 'বিক্রেতা'),
          lastMessage: msg.text || (msg.imageUrl ? '[ছবি]' : msg.audioUrl ? '[ভয়েস নোট]' : '[ভিডিও]'),
          lastMessageTime: msg.createdAt,
          lastSenderId: msg.senderId,
          unreadCount
        });
      }
    });

    // 2. If initialAdId was requested and no thread exists yet, add a synthetic initial thread
    if (initialAdId) {
      const ad = ads.find((a) => a.id === initialAdId);
      if (ad) {
        const sellerId = ad.userId || 'seller';
        const buyerId = myUid;
        const threadId = `${ad.id}_${buyerId}_${sellerId}`;

        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            id: threadId,
            adId: ad.id,
            adTitle: ad.title,
            adImage: ad.images?.[0] || '',
            adPrice: ad.price,
            buyerId,
            buyerName: currentUser?.displayName || currentUser?.name || 'আপনি (ক্রেতা)',
            sellerId,
            sellerName: ad.sellerName,
            lastMessage: 'কথোপকথন শুরু করতে বার্তা লিখুন...',
            lastMessageTime: new Date().toISOString(),
            lastSenderId: buyerId,
            unreadCount: 0
          });
        }
      }
    }

    // Sort threads by most recent message
    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [chatMessages, ads, currentUser, myUid, initialAdId]);

  // Set initial thread if passed
  useEffect(() => {
    if (initialAdId) {
      const ad = ads.find((a) => a.id === initialAdId);
      if (ad) {
        const threadId = `${ad.id}_${myUid}_${ad.userId || 'seller'}`;
        setSelectedThreadId(threadId);
        setInThread(true);
      }
    } else if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id);
    }
  }, [initialAdId, threads, myUid, ads, selectedThreadId]);

  // Active thread and messages for the selected conversation
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === selectedThreadId) || (threads.length > 0 ? threads[0] : null);
  }, [threads, selectedThreadId]);

  const activeAd = useMemo(() => {
    if (!activeThread) return null;
    return ads.find((a) => a.id === activeThread.adId) || null;
  }, [ads, activeThread]);

  const threadMessages = useMemo(() => {
    if (!activeThread) return [];
    return chatMessages.filter((m) => {
      if (m.threadId && m.threadId === activeThread.id) return true;
      if (m.adId === activeThread.adId) {
        const matchesSenderReceiver = 
          (m.senderId === activeThread.buyerId && (m.receiverId === activeThread.sellerId || !m.receiverId)) ||
          (m.senderId === activeThread.sellerId && (m.receiverId === activeThread.buyerId || !m.receiverId)) ||
          (!m.receiverId);
        return matchesSenderReceiver;
      }
      return false;
    });
  }, [chatMessages, activeThread]);

  // Notify parent of thread state for hiding nav/footer
  useEffect(() => {
    if (onThreadStateChange) {
      onThreadStateChange(inThread);
    }
  }, [inThread, onThreadStateChange]);

  // Handle hardware / browser back button navigation
  useEffect(() => {
    if (inThread) {
      window.history.pushState({ chatThreadOpen: true }, '');
      const handlePopState = () => {
        setInThread(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [inThread]);

  // Mark unread messages in the active thread as read
  useEffect(() => {
    if (!activeThread || !inThread) return;

    const unreadMsgs = threadMessages.filter(
      (m) => m.senderId !== myUid && m.status !== 'read'
    );

    if (unreadMsgs.length > 0) {
      const ids = unreadMsgs.map((m) => m.id);
      markFirestoreMessagesAsRead(activeThread.adId, myUid, ids);
    }
  }, [activeThread, inThread, threadMessages, myUid]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages, inThread, isSending]);

  // Audio Recorder logic
  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('আপনার ব্রাউজারে অডিও রেকর্ডিং সাপোর্ট করে না বা সিকিউর (HTTPS) সংযোগ নেই।');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
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

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrlPreview(url);
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access issue:', err);
      setIsRecordingAudio(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);

      const errName = err?.name || '';
      const errMsg = String(err?.message || '').toLowerCase();

      if (
        errName === 'NotFoundError' || 
        errName === 'DevicesNotFoundError' || 
        errMsg.includes('requested device not found') ||
        errMsg.includes('device not found')
      ) {
        alert('আপনার ডিভাইসে কোনো মাইক্রোফোন বা অডিও ইনপুট ডিভাইস পাওয়া যায়নি। অনুগ্রহ করে হেডফোন বা মাইক্রোফোন সংযোগ করুন।');
      } else if (
        errName === 'NotAllowedError' || 
        errName === 'PermissionDeniedError' ||
        errMsg.includes('permission denied')
      ) {
        alert('মাইক্রোফোন ব্যবহারের অনুমতি বাতিল করা হয়েছে। ব্রাউজারের সাইট সেটিংস থেকে মাইক্রোফোন Allow করুন।');
      } else {
        alert('মাইক্রোফোন চালু করা যায়নি: ' + (err?.message || 'অনুগ্রহ করে মাইক্রোফোন ব্যবহারের অনুমতি দিন এবং নিশ্চিত করুন সাইটটি HTTPS-এ চলছে।'));
      }
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecordingAudio(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecordingAudio(false);
      clearInterval(recordTimerRef.current);
    }
    setRecordedAudioBlob(null);
    setAudioUrlPreview(null);
    setRecordingSeconds(0);
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !chatImagePreview && !chatVideoPreview && !recordedAudioBlob && !chatImageFile && !chatVideoFile) return;
    if (!activeThread) return;

    setIsSending(true);

    try {
      let finalImageUrl: string | undefined = undefined;
      let finalVideoUrl: string | undefined = undefined;
      let finalAudioUrl: string | undefined = undefined;

      // 1. Upload Image to Firebase Storage with compression
      if (chatImageFile) {
        finalImageUrl = await uploadMediaToFirebaseStorage(chatImageFile, 'chatMedia');
      } else if (chatImagePreview) {
        finalImageUrl = chatImagePreview;
      }

      // 2. Upload Video to Firebase Storage
      if (chatVideoFile) {
        finalVideoUrl = await uploadMediaToFirebaseStorage(chatVideoFile, 'chatMedia');
      } else if (chatVideoPreview) {
        finalVideoUrl = chatVideoPreview;
      }

      // 3. Upload Voice Audio Recording to Firebase Storage
      if (recordedAudioBlob) {
        finalAudioUrl = await uploadMediaToFirebaseStorage(recordedAudioBlob, 'chatMedia');
      }

      const isSeller = currentUser ? currentUser.uid === activeThread.sellerId : false;
      const receiverId = isSeller ? activeThread.buyerId : activeThread.sellerId;
      const receiverName = isSeller ? activeThread.buyerName : activeThread.sellerName;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        threadId: activeThread.id,
        adId: activeThread.adId,
        adTitle: activeThread.adTitle,
        senderId: myUid,
        senderName: currentUser?.displayName || currentUser?.name || (isSeller ? `${activeThread.sellerName} (বিক্রেতা)` : 'আপনি (ক্রেতা)'),
        receiverId,
        receiverName,
        isSeller,
        text: inputText.trim(),
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        audioUrl: finalAudioUrl,
        audioDuration: recordingSeconds || undefined,
        status: 'delivered',
        createdAt: new Date().toISOString()
      };

      await sendFirestoreMessage(newMsg);

      setInputText('');
      setChatImageFile(null);
      setChatImagePreview(null);
      setChatVideoFile(null);
      setChatVideoPreview(null);
      setRecordedAudioBlob(null);
      setAudioUrlPreview(null);
      setRecordingSeconds(0);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Image File Select with instant client-side compression (< 300KB)
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('ছবির সাইজ ১৫ মেগাবাইটের কম হতে হবে।');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setChatImagePreview(previewUrl);
      setChatVideoFile(null);
      setChatVideoPreview(null);

      try {
        const compressed = await compressImageClientSide(file, 960, 0.70);
        setChatImageFile(compressed);
      } catch (err) {
        console.warn('Compression fallback to original file:', err);
        setChatImageFile(file);
      }
    }
  };

  // Handle Video File Select
  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('ভিডিওর সাইজ ২৫ মেগাবাইটের কম হতে হবে।');
        return;
      }
      setChatVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatVideoPreview(reader.result as string);
        setChatImageFile(null);
        setChatImagePreview(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Handle Report Submission
  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAd) return;
    setIsSubmittingReport(true);
    try {
      await submitReport({
        reporterId: currentUser?.uid,
        reporterName: currentUser?.displayName || currentUser?.email || 'ব্যবহারকারী',
        reportedUserId: activeAd.userId || activeAd.sellerPhone,
        reportedUserName: activeAd.sellerName,
        adId: activeAd.id,
        adTitle: activeAd.title,
        reason: reportReason,
        details: reportDetails.trim()
      });
      setReportToast('রিপোর্টটি সফলভাবে জমা হয়েছে। অ্যাডমিন টিম দ্রুত যাচাই করবে।');
      setIsReportModalOpen(false);
      setReportDetails('');
      setTimeout(() => setReportToast(''), 4000);
    } catch (err: any) {
      alert('রিপোর্ট পাঠাতে ব্যর্থ হয়েছে: ' + (err.message || 'ত্রুটি'));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Filtered threads for inbox search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) => 
      t.adTitle.toLowerCase().includes(q) ||
      t.buyerName.toLowerCase().includes(q) ||
      t.sellerName.toLowerCase().includes(q) ||
      t.lastMessage.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  // ------------------------------------------------------------------
  // FULL SCREEN ACTIVE CHAT THREAD VIEW (MESSENGER INTERFACE)
  // ------------------------------------------------------------------
  if (inThread && activeThread) {
    const partnerName = currentUser && currentUser.uid === activeThread.sellerId
      ? `${activeThread.buyerName} (ক্রেতা)`
      : `${activeThread.sellerName} (বিক্রেতা)`;

    return (
      <div className="fixed inset-0 z-50 bg-[#f4f6f8] flex flex-col h-[100dvh] w-full max-w-full overflow-hidden">
        
        {/* Toast Notification */}
        {reportToast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold bg-[#0A1128] text-white border border-emerald-500 flex items-center gap-2 animate-in slide-in-from-top-3">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reportToast}</span>
          </div>
        )}

        {/* Full-Screen Messenger Header */}
        <header className="bg-[#0A1128] text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Prominent Back Button */}
            <button
              onClick={() => setInThread(false)}
              id="btn-chat-thread-back"
              aria-label="ইনবক্সে ফিরে যান"
              className="p-2 -ml-1 text-white hover:bg-white/10 active:scale-95 rounded-full transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF6600]" />
            </button>

            {/* Ad & Partner Avatar */}
            <div className="relative shrink-0">
              {activeThread.adImage ? (
                <img
                  src={activeThread.adImage}
                  alt={activeThread.adTitle}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FF6600] text-white flex items-center justify-center font-black text-sm">
                  BK
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0A1128] rounded-full"></span>
            </div>

            {/* Partner & Ad Details */}
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                {partnerName}
              </h2>
              <p className="text-[11px] text-gray-300 truncate flex items-center gap-1">
                {activeThread.adPrice !== undefined && (
                  <span className="text-[#FF6600] font-semibold">৳ {activeThread.adPrice.toLocaleString()}</span>
                )}
                <span>•</span>
                <span className="truncate">{activeThread.adTitle}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              title="ব্যবহারকারী রিপোর্ট করুন"
              className="p-2 text-gray-300 hover:text-red-400 hover:bg-white/10 rounded-full transition cursor-pointer flex items-center gap-1 text-xs"
            >
              <Flag className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline text-[11px] text-red-400 font-semibold">রিপোর্ট</span>
            </button>

            {activeAd && (
              <button
                onClick={() => {
                  setInThread(false);
                  onSelectAd(activeAd);
                }}
                id="btn-chat-view-ad-details"
                className="text-xs bg-[#FF6600] hover:bg-[#e65c00] active:scale-95 text-white font-bold px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs transition shrink-0 cursor-pointer"
              >
                বিজ্ঞাপন দেখুন
              </button>
            )}
          </div>
        </header>

        {/* Real-time Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#eef2f5] overscroll-contain">
          {threadMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
              <div className="w-14 h-14 rounded-full bg-white shadow-xs flex items-center justify-center mb-3">
                <MessageCircle className="w-7 h-7 text-[#FF6600]" />
              </div>
              <h3 className="text-sm font-bold text-[#0A1128] mb-1">কোনো পূর্ববর্তী বার্তা নেই</h3>
              <p className="text-xs max-w-xs text-gray-500">
                বিক্রেতাকে সরাসরি মেসেজ, ছবি বা ভয়েস নোট পাঠান।
              </p>
            </div>
          ) : (
            threadMessages.map((msg) => {
              const isMe = msg.senderId === myUid;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs ${
                      isMe
                        ? 'bg-[#0A1128] text-white rounded-br-xs'
                        : 'bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs'
                    }`}
                  >
                    {!isMe && (
                      <span className="block text-[10px] font-bold text-[#FF6600] mb-1">
                        {msg.senderName}
                      </span>
                    )}

                    {/* Image Attachment */}
                    {(msg.messageType === 'image' || msg.imageUrl) && (
                      <div className="mb-2 overflow-hidden rounded-xl bg-black/5">
                        <img
                          src={msg.mediaUrl || msg.imageUrl}
                          alt="সংযুক্ত ছবি"
                          className="max-h-64 w-full object-contain rounded-xl cursor-pointer hover:opacity-95 transition"
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(msg.mediaUrl || msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}

                    {/* Video Attachment */}
                    {(msg.messageType === 'video' || msg.videoUrl) && (
                      <div className="mb-2 overflow-hidden rounded-xl bg-black flex justify-center">
                        <video
                          src={msg.mediaUrl || msg.videoUrl}
                          controls
                          style={{ width: '250px', maxWidth: '100%', borderRadius: '10px' }}
                          className="max-h-64 rounded-xl"
                        />
                      </div>
                    )}

                    {/* Audio / Voice Message */}
                    {(msg.messageType === 'audio' || msg.audioUrl) && (
                      <div className="mb-1 space-y-1">
                        <AudioVoiceMessage
                          audioUrl={msg.mediaUrl || msg.audioUrl || ''}
                          duration={msg.audioDuration}
                          isMe={isMe}
                        />
                        <audio 
                          src={msg.mediaUrl || msg.audioUrl} 
                          controls 
                          className="w-full max-w-[240px] h-8 rounded-lg"
                        />
                      </div>
                    )}

                    {/* Text content */}
                    {msg.text && (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* Timestamp and Delivery Checkmark */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                        isMe ? 'text-gray-300' : 'text-gray-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMe && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3 h-3 text-cyan-400 stroke-[2.5]" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-300 stroke-[2]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Media Preview Drawer (Image, Video, Voice) */}
        {(chatImagePreview || chatVideoPreview || audioUrlPreview || isRecordingAudio) && (
          <div className="p-2 sm:p-2.5 bg-orange-50 border-t border-orange-200 flex items-center justify-between gap-2 shrink-0">
            {isRecordingAudio && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                <span>ভয়েস রেকর্ড হচ্ছে... ({formatTimer(recordingSeconds)})</span>
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-0.5 rounded-lg text-xs ml-2 cursor-pointer font-bold"
                >
                  রেকর্ড থামান
                </button>
              </div>
            )}

            {audioUrlPreview && !isRecordingAudio && (
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span>ভয়েস নোট ({formatTimer(recordingSeconds)})</span>
                <audio src={audioUrlPreview} controls className="h-6 w-36 sm:w-48" />
                <button
                  type="button"
                  onClick={cancelAudioRecording}
                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {chatImagePreview && (
              <div className="relative inline-block">
                <img
                  src={chatImagePreview}
                  alt="সংযুক্ত ছবি"
                  className="w-12 h-12 object-cover rounded-lg border border-orange-300"
                />
                <button
                  type="button"
                  onClick={() => setChatImagePreview(null)}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {chatVideoPreview && (
              <div className="relative inline-block flex items-center gap-2">
                <video
                  src={chatVideoPreview}
                  className="w-12 h-12 object-cover rounded-lg border border-orange-300 bg-black"
                />
                <span className="text-xs text-gray-700 font-semibold">ভিডিও ফাইল সংযুক্ত</span>
                <button
                  type="button"
                  onClick={() => setChatVideoPreview(null)}
                  className="bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Input Bar */}
        <form 
          onSubmit={handleSendMessage}
          className="p-2 sm:p-3 bg-white border-t border-gray-200 flex items-center gap-1.5 sm:gap-2 w-full max-w-full box-border shrink-0"
        >
          {/* Image Upload */}
          <label 
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl cursor-pointer transition shrink-0 flex items-center justify-center"
            title="ছবি পাঠান"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
          </label>

          {/* Video Upload */}
          <label 
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl cursor-pointer transition shrink-0 flex items-center justify-center"
            title="ভিডিও পাঠান"
          >
            <Film className="w-4 h-4 text-blue-600" />
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoFile}
            />
          </label>

          {/* Voice Record Mic */}
          {!isRecordingAudio ? (
            <button
              type="button"
              onClick={startAudioRecording}
              title="ভয়েস রেকর্ড করুন"
              className="p-2 text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 active:scale-95 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Mic className="w-4 h-4 text-red-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelAudioRecording}
              title="রেকর্ড বাতিল করুন"
              className="p-2 text-red-600 bg-red-100 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Square className="w-4 h-4 fill-red-600" />
            </button>
          )}

          {/* Input text box */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="বার্তা লিখুন..."
            className="min-w-0 flex-1 bg-slate-100 border border-gray-200 focus:border-[#FF6600] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1A202C] focus:outline-none focus:bg-white transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !chatImagePreview && !chatVideoPreview && !recordedAudioBlob && !chatImageFile && !chatVideoFile)}
            id="btn-chat-send"
            className="bg-[#FF6600] hover:bg-[#e65c00] active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden xs:inline">পাঠানো হচ্ছে...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">পাঠান</span>
              </>
            )}
          </button>
        </form>

        {/* Report Modal */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-[#0A1128]">ব্যবহারকারী রিপোর্ট করুন</h3>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">অভিযোগের কারণ নির্বাচন করুন:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
                  >
                    <option value="প্রতারণা বা ভুয়া বিজ্ঞাপন">প্রতারণা বা ভুয়া বিজ্ঞাপন (Fraud/Scam)</option>
                    <option value="অশালীন বা আক্রমণাত্মক বার্তা">অশালীন বা আক্রমণাত্মক বার্তা (Harassment)</option>
                    <option value="ভুল দাম বা অনুপযুক্ত তথ্য">ভুল দাম বা অনুপযুক্ত তথ্য (Misleading info)</option>
                    <option value="নিষিদ্ধ বা অবৈধ পণ্য">নিষিদ্ধ বা অবৈধ পণ্য (Prohibited item)</option>
                    <option value="অন্যান্য">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">বিস্তারিত বিবরণ (ঐচ্ছিক):</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="ঘটনার সংক্ষিপ্ত বিবরণ লিখুন..."
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

      </div>
    );
  }

  // ------------------------------------------------------------------
  // INBOX CONVERSATIONS LIST (DEFAULT INBOX OVERVIEW)
  // ------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-4 mb-24 sm:mb-16 w-full max-w-full box-border">
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-[#FF6600] rounded-full shrink-0"></div>
          <h1 className="text-lg sm:text-2xl font-black text-[#0A1128] truncate">
            {t('chat.inbox_title', 'ইনবক্স ও বার্তা (Real-Time Chat)')}
          </h1>
        </div>

        {threads.length > 0 && (
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            মোট {threads.length}টি বার্তালাপ
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[520px] w-full max-w-full">
        
        {/* Left Side: Conversations List */}
        <div className="border-r border-gray-200 bg-slate-50/70 p-3 overflow-y-auto max-h-[580px] flex flex-col">
          
          {/* Search Filter Box */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="চ্যাট খুঁজুন..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-[#0A1128] focus:outline-none focus:border-[#FF6600]"
            />
          </div>

          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-2 block">
            {t('chat.all_conversations', 'সক্রিয় বার্তালাপ')}
          </span>
          
          <div className="space-y-1.5 flex-1">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-3 text-gray-400">
                <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">কোনো চ্যাট পাওয়া যায়নি</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  বিজ্ঞাপন থেকে বিক্রেতার সাথে চ্যাট শুরু করুন।
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThreadId === thread.id;
                const isSeller = currentUser && currentUser.uid === thread.sellerId;
                const partnerLabel = isSeller ? thread.buyerName : thread.sellerName;

                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setInThread(true);
                    }}
                    className={`p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition ${
                      isSelected 
                        ? 'bg-orange-50 border border-orange-300 shadow-2xs' 
                        : 'bg-white hover:bg-orange-50/40 border border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0">
                      {thread.adImage ? (
                        <img
                          src={thread.adImage}
                          alt={thread.adTitle}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#0A1128] text-white flex items-center justify-center font-bold text-xs">
                          BK
                        </div>
                      )}
                      {thread.unreadCount && thread.unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF6600] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    {/* Details */}
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-black text-[#0A1128] truncate">
                          {partnerLabel}
                        </h4>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {formatMessageTime(thread.lastMessageTime)}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-[#FF6600] font-bold truncate">
                        {thread.adTitle}
                      </p>

                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {thread.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Desktop Placeholder or Active Thread Selector */}
        <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center p-8 text-center bg-white">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-3">
            <MessageCircle className="w-8 h-8 text-[#FF6600]" />
          </div>
          <h3 className="text-base font-bold text-[#0A1128] mb-1">
            সরাসরি নিরাপদ চ্যাট সিস্টেম (Real-Time Messenger)
          </h3>
          <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-4">
            বামপাশের তালিকা থেকে যেকোনো বিজ্ঞাপন সিলেক্ট করুন অথবা পণ্যের বিস্তারিত পেজ থেকে বিক্রেতার সাথে চ্যাট শুরু করুন।
          </p>
          {threads.length > 0 && (
            <button
              onClick={() => {
                if (threads[0]) {
                  setSelectedThreadId(threads[0].id);
                  setInThread(true);
                }
              }}
              className="bg-[#0A1128] hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
            >
              সাম্প্রতিক বার্তা খুলুন
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
