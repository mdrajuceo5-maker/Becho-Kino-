import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    // Navigation & Global
    'nav.home': 'হোম',
    'nav.my_ads': 'আমার বিজ্ঞাপন',
    'nav.post_ad': 'বিজ্ঞাপন দিন',
    'nav.chat': 'বার্তা',
    'nav.profile': 'অ্যাকাউন্ট',
    'nav.login_register': 'লগইন / সাইন আপ',
    'nav.admin': 'অ্যাডমিন প্যানেল',
    'nav.logout': 'লগআউট',

    // Hero & Search
    'hero.search_placeholder': 'কী খুঁজছেন? যেমন: iPhone 14 Pro, Yamaha R15...',
    'hero.search_button': 'অনুসন্ধান',
    'hero.title': 'বাংলাদেশে ক্রয় বিক্রয় এর বিশ্বস্ত প্ল্যাটফর্ম',
    'hero.subtitle': 'সহজেই বিক্রয় করুন আপনার নতুন ও ব্যবহৃত পণ্য।',

    // Location Filter
    'filter.all_bangladesh': 'সমগ্র বাংলাদেশ',
    'filter.select_division': 'বিভাগ নির্বাচন করুন',
    'filter.select_district': 'জেলা নির্বাচন করুন',
    'filter.select_upazila': 'উপজেলা নির্বাচন করুন',
    'filter.apply': 'ফিল্টার প্রয়োগ',
    'filter.reset': 'রিসেট',

    // Categories
    'cat.all': 'সব বিজ্ঞাপন',
    'cat.electronics': 'ইলেকট্রনিক',
    'cat.computer': 'কম্পিউটার এন্ড ল্যাপটপ',
    'cat.mobile': 'মোবাইল',
    'cat.furniture': 'আসবাবপত্র',
    'cat.bike': 'বাইক',
    'cat.motorcycle': 'মোটরসাইকেল',

    // Ads Grid & Cards
    'ads.recent_title': 'সাম্প্রতিক বিজ্ঞাপনসমূহ',
    'ads.view_all': 'সবগুলো দেখুন',
    'ads.no_ads': 'কোনো বিজ্ঞাপন পাওয়া যায়নি',
    'ads.brand_new': 'একদম নতুন',
    'ads.used': 'ব্যবহৃত',
    'ads.negotiable': 'আলোচনা সাপেক্ষ',
    'ads.fixed_price': 'ফিক্সড প্রাইস',
    'ads.taka': '৳',
    'ads.views': 'ভিউ',

    // Ad Details
    'details.back': 'ফিরে যান',
    'details.condition': 'কন্ডিশন',
    'details.price_type': 'মূল্যের ধরন',
    'details.category': 'ক্যাটাগরি',
    'details.location': 'অবস্থান',
    'details.model': 'মডেল',
    'details.description': 'বিজ্ঞাপনের বিবরণ',
    'details.contact_seller': 'বিক্রেতার সাথে যোগাযোগ করুন',
    'details.call': 'কল করুন',
    'details.whatsapp': 'WhatsApp',
    'details.live_chat': 'সরাসরি চ্যাট করুন',
    'details.safety_warning': 'অগ্রিম অর্থ প্রদান করবেন না, এমনকি ডেলিভারির জন্যও নয়! কোনো প্রকার প্রতারিত হলে, BechoKino.com দায়ী থাকবে না।',
    'details.report': 'ভুয়া বা আপত্তিকর বিজ্ঞাপন? রিপোর্ট করুন',
    'details.related_ads': 'রিলেটেড অন্যান্য বিজ্ঞাপন',
    'details.delete_ad': 'বিজ্ঞাপন ডিলিট করুন',

    // Post Ad
    'post.title': 'নতুন বিজ্ঞাপন দিন',
    'post.subtitle': 'আপনার পণ্যের সঠিক তথ্য দিয়ে ক্রেতাদের দ্রুত আকৃষ্ট করুন',
    'post.ad_title_label': 'বিজ্ঞাপনের শিরোনাম',
    'post.ad_title_placeholder': 'যেমন: iPhone 13 Pro Max 256GB Urgent Sale',
    'post.category_label': 'ক্যাটাগরি নির্বাচন করুন',
    'post.condition_label': 'পণ্যের কন্ডিশন',
    'post.model_label': 'মডেল / ব্র্যান্ড',
    'post.price_label': 'মূল্য (টাকা)',
    'post.is_negotiable': 'দাম আলোচনা সাপেক্ষ',
    'post.division_label': 'বিভাগ',
    'post.district_label': 'জেলা',
    'post.upazila_label': 'উপজেলা',
    'post.description_label': 'বিস্তারিত বিবরণ',
    'post.seller_name': 'আপনার নাম',
    'post.seller_phone': 'মোবাইল নম্বর',
    'post.seller_whatsapp': 'WhatsApp নম্বর (ঐচ্ছিক)',
    'post.pin_label': 'ডিলিট পিন (৪ সংখ্যা)',
    'post.images_label': 'পণ্যের ছবি আপলোড করুন (সর্বোচ্চ ৫টি)',
    'post.submit_free': 'ফ্রি বিজ্ঞাপন প্রকাশ করুন',
    'post.choose_package': 'প্যাকেজ বাছাই ও পোস্ট করুন',

    // Chat
    'chat.inbox_title': 'ইনবক্স ও বার্তা',
    'chat.no_messages': 'কোনো বার্তা নেই',
    'chat.type_message': 'বার্তা লিখুন...',
    'chat.send': 'পাঠান',
    'chat.recording': 'ভয়েস রেকর্ড হচ্ছে...',
    'chat.stop_record': 'রেকর্ড থামান',
    'chat.cancel_record': 'রেকর্ড বাতিল করুন',
    'chat.view_ad': 'বিজ্ঞাপন দেখুন',
    'chat.all_conversations': 'সক্রিয় বার্তালাপ',

    // Profile & Account
    'profile.title': 'আমার প্রোফাইল ও সেটিংস',
    'profile.lang_label': 'ভাষা নির্বাচন (Language)',
    'profile.favorites': 'সংরক্ষিত বিজ্ঞাপন',
    'profile.my_ads': 'আমার প্রকাশিত বিজ্ঞাপন',
    'profile.account_details': 'অ্যাকাউন্টের তথ্য',
    'profile.logout': 'লগআউট করুন',
    'profile.phone': 'ফোন নম্বর',
    'profile.email': 'ইমেইল',
    'profile.member_since': 'সদস্য হয়েছেন'
  },
  en: {
    // Navigation & Global
    'nav.home': 'Home',
    'nav.my_ads': 'My Ads',
    'nav.post_ad': 'Post Ad',
    'nav.chat': 'Messages',
    'nav.profile': 'Account',
    'nav.login_register': 'Login / Sign Up',
    'nav.admin': 'Admin Panel',
    'nav.logout': 'Logout',

    // Hero & Search
    'hero.search_placeholder': 'What are you looking for? e.g. iPhone 14 Pro, Yamaha R15...',
    'hero.search_button': 'Search',
    'hero.title': 'Trusted Buy & Sell Platform in Bangladesh',
    'hero.subtitle': 'Easily sell your new and used items.',

    // Location Filter
    'filter.all_bangladesh': 'All Bangladesh',
    'filter.select_division': 'Select Division',
    'filter.select_district': 'Select District',
    'filter.select_upazila': 'Select Upazila',
    'filter.apply': 'Apply Filter',
    'filter.reset': 'Reset',

    // Categories
    'cat.all': 'All Ads',
    'cat.electronics': 'Electronics',
    'cat.computer': 'Computers & Laptops',
    'cat.mobile': 'Mobiles',
    'cat.furniture': 'Furniture',
    'cat.bike': 'Bikes',
    'cat.motorcycle': 'Motorcycles',

    // Ads Grid & Cards
    'ads.recent_title': 'Recent Advertisements',
    'ads.view_all': 'View All',
    'ads.no_ads': 'No advertisements found',
    'ads.brand_new': 'Brand New',
    'ads.used': 'Used',
    'ads.negotiable': 'Negotiable',
    'ads.fixed_price': 'Fixed Price',
    'ads.taka': '৳',
    'ads.views': 'views',

    // Ad Details
    'details.back': 'Back',
    'details.condition': 'Condition',
    'details.price_type': 'Price Type',
    'details.category': 'Category',
    'details.location': 'Location',
    'details.model': 'Model',
    'details.description': 'Description',
    'details.contact_seller': 'Contact Seller',
    'details.call': 'Call Now',
    'details.whatsapp': 'WhatsApp',
    'details.live_chat': 'Live Chat',
    'details.safety_warning': 'Do not pay in advance, even for delivery! BechoKino.com is not liable for fraud.',
    'details.report': 'Fake or abusive ad? Report here',
    'details.related_ads': 'Related Advertisements',
    'details.delete_ad': 'Delete Ad',

    // Post Ad
    'post.title': 'Post a New Ad',
    'post.subtitle': 'Provide accurate details to attract genuine buyers quickly',
    'post.ad_title_label': 'Ad Title',
    'post.ad_title_placeholder': 'e.g., iPhone 13 Pro Max 256GB Urgent Sale',
    'post.category_label': 'Select Category',
    'post.condition_label': 'Product Condition',
    'post.model_label': 'Model / Brand',
    'post.price_label': 'Price (BDT)',
    'post.is_negotiable': 'Price is negotiable',
    'post.division_label': 'Division',
    'post.district_label': 'District',
    'post.upazila_label': 'Upazila',
    'post.description_label': 'Detailed Description',
    'post.seller_name': 'Your Name',
    'post.seller_phone': 'Mobile Number',
    'post.seller_whatsapp': 'WhatsApp Number (Optional)',
    'post.pin_label': 'Delete PIN (4 digits)',
    'post.images_label': 'Upload Product Images (Max 5)',
    'post.submit_free': 'Post Free Ad',
    'post.choose_package': 'Choose Package & Post',

    // Chat
    'chat.inbox_title': 'Inbox & Messages',
    'chat.no_messages': 'No messages yet',
    'chat.type_message': 'Type a message...',
    'chat.send': 'Send',
    'chat.recording': 'Recording voice...',
    'chat.stop_record': 'Stop Recording',
    'chat.cancel_record': 'Cancel Recording',
    'chat.view_ad': 'View Ad',
    'chat.all_conversations': 'Active Chats',

    // Profile & Account
    'profile.title': 'My Profile & Settings',
    'profile.lang_label': 'Language (ভাষা নির্বাচন)',
    'profile.favorites': 'Saved Favorites',
    'profile.my_ads': 'My Posted Ads',
    'profile.account_details': 'Account Details',
    'profile.logout': 'Sign Out',
    'profile.phone': 'Phone Number',
    'profile.email': 'Email Address',
    'profile.member_since': 'Member Since'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('bechokino_lang') as Language;
      return saved === 'en' || saved === 'bn' ? saved : 'bn';
    } catch {
      return 'bn';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('bechokino_lang', lang);
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
