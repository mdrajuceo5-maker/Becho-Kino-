import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { BANGLADESH_DIVISIONS, CATEGORIES_LIST } from './src/data/bangladeshData.ts';
import { INITIAL_ADS } from './src/data/initialAds.ts';
import { Ad, ChatMessage, SiteSettings } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory state with initial seed data
let siteSettings: SiteSettings = {
  siteName: 'BechoKino.com',
  siteTagline: 'বাংলাদেশে ক্রয় বিক্রয় এর বিশ্বস্ত প্রতিষ্ঠান',
  logoUrl: null, // null will render the beautiful brand vector BechoKino.com logo, or custom uploaded image URL/base64
  logoType: 'svg_brand',
  bannerSubtitle: 'সহজেই বিক্রয় করুন আপনার পণ্য।',
  seoDescription: 'BechoKino.com - বাংলাদেশের সবচেয়ে নির্ভরযোগ্য অনলাইন প্ল্যাটফর্ম, যেখানে আপনি খুব সহজেই নতুন এবং ব্যবহৃত (Second-hand) পণ্য ক্রয়-বিক্রয় করতে পারবেন। মোবাইল, ইলেকট্রনিক্স, বাইক থেকে শুরু করে প্রপার্টি—সবকিছুই কিনুন বা বিক্রি করুন একদম ফ্রি-তে। আজই আপনার বিজ্ঞাপন দিন!',
  announcementText: '🎉 BechoKino.com এ স্বাগতম! সম্পূর্ণ ফ্রিতে বিজ্ঞাপন দিন এবং লাখো ক্রেতার কাছে পৌঁছান।',
  enableLiveChat: true,
  adminPin: 'admin123'
};

let adsDatabase: Ad[] = [...INITIAL_ADS];

let chatMessagesDatabase: ChatMessage[] = [
  {
    id: 'msg-1',
    adId: 'ad-102',
    adTitle: 'Hrkriv',
    senderId: 'buyer-user-1',
    senderName: 'Rahim Khan',
    isSeller: false,
    text: 'আসসালামু আলাইকুম ভাই, ফোনটার ব্যাটারি ব্যাকআপ কেমন থাকে?',
    createdAt: '2026-08-27T08:30:00.000Z'
  },
  {
    id: 'msg-2',
    adId: 'ad-102',
    adTitle: 'Hrkriv',
    senderId: 'seller-user-1',
    senderName: 'Gulshan Shop',
    isSeller: true,
    text: 'ওয়ালাইকুম আসসালাম ভাইয়া। ব্যাটারি হেলথ ৮৮% আছে, হেভি ব্যবহারে সারাদিন অনায়াসে ব্যাকআপ পাবেন।',
    createdAt: '2026-08-27T08:35:00.000Z'
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for direct mobile gallery image uploads (base64)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Settings & Logo APIs
  app.get('/api/settings', (req: Request, res: Response) => {
    res.json({ success: true, data: siteSettings });
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    const { adminPin, siteName, siteTagline, logoUrl, logoType, bannerSubtitle, announcementText } = req.body;
    
    if (adminPin && adminPin !== siteSettings.adminPin) {
      return res.status(401).json({ success: false, message: 'ভুল অ্যাডমিন পিন কোড!' });
    }

    siteSettings = {
      ...siteSettings,
      ...(siteName && { siteName }),
      ...(siteTagline && { siteTagline }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(logoType && { logoType }),
      ...(bannerSubtitle && { bannerSubtitle }),
      ...(announcementText !== undefined && { announcementText }),
    };

    res.json({
      success: true,
      message: 'সেটিংস সফলভাবে আপডেট করা হয়েছে!',
      data: siteSettings
    });
  });

  // Upload/Change Logo API (Supports direct gallery base64 upload or URL)
  app.post('/api/settings/logo', (req: Request, res: Response) => {
    const { logoData, adminPin } = req.body;

    if (adminPin && adminPin !== siteSettings.adminPin) {
      return res.status(401).json({ success: false, message: 'ভুল অ্যাডমিন পিন কোড!' });
    }

    if (!logoData) {
      // Reset logo to default brand logo
      siteSettings.logoUrl = null;
      siteSettings.logoType = 'svg_brand';
      return res.json({
        success: true,
        message: 'ডিফল্ট লোগো রিসেট করা হয়েছে।',
        data: siteSettings
      });
    }

    siteSettings.logoUrl = logoData;
    siteSettings.logoType = 'custom_image';

    res.json({
      success: true,
      message: 'লোগো সফলভাবে আপলোড ও আপডেট করা হয়েছে!',
      data: siteSettings
    });
  });

  // Locations API
  app.get('/api/locations', (req: Request, res: Response) => {
    res.json({ success: true, divisions: BANGLADESH_DIVISIONS, categories: CATEGORIES_LIST });
  });

  // Ads API (Filtering by search, division, district, upazila, category, condition)
  app.get('/api/ads', (req: Request, res: Response) => {
    const { q, division, district, upazila, category, condition, featured } = req.query;

    let results = [...adsDatabase];

    if (q && typeof q === 'string' && q.trim()) {
      const searchTerms = q.toLowerCase().trim();
      results = results.filter(ad => 
        ad.title.toLowerCase().includes(searchTerms) ||
        ad.description.toLowerCase().includes(searchTerms) ||
        (ad.model && ad.model.toLowerCase().includes(searchTerms)) ||
        ad.category.toLowerCase().includes(searchTerms) ||
        ad.upazila.toLowerCase().includes(searchTerms) ||
        ad.district.toLowerCase().includes(searchTerms)
      );
    }

    if (division && typeof division === 'string' && division !== 'all' && division !== 'সব বিভাগ') {
      results = results.filter(ad => ad.division.includes(division) || division.includes(ad.division));
    }

    if (district && typeof district === 'string' && district !== 'all' && district !== 'সব জেলা') {
      results = results.filter(ad => ad.district.includes(district) || district.includes(ad.district));
    }

    if (upazila && typeof upazila === 'string' && upazila !== 'all' && upazila !== 'সব উপজেলা') {
      results = results.filter(ad => ad.upazila.includes(upazila) || upazila.includes(ad.upazila));
    }

    if (category && typeof category === 'string' && category !== 'all' && category !== 'সব বিজ্ঞাপন') {
      results = results.filter(ad => 
        ad.categoryKey === category || 
        ad.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (condition && typeof condition === 'string' && (condition === 'used' || condition === 'new')) {
      results = results.filter(ad => ad.condition === condition);
    }

    if (featured === 'true') {
      results = results.filter(ad => ad.featured === true);
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  });

  // Single Ad Details
  app.get('/api/ads/:id', (req: Request, res: Response) => {
    const ad = adsDatabase.find(a => a.id === req.params.id || a.slug === req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'বিজ্ঞাপনটি খুঁজে পাওয়া যায়নি।' });
    }
    ad.views += 1;
    res.json({ success: true, data: ad });
  });

  // Create New Ad (with image gallery uploads, PIN, and specs)
  app.post('/api/ads', (req: Request, res: Response) => {
    const {
      title,
      condition,
      category,
      model,
      division,
      district,
      upazila,
      description,
      price,
      isNegotiable,
      phone,
      deletePin,
      images,
      sellerName,
      featuredSpecs
    } = req.body;

    if (!title || !category || !division || !district || !upazila || !description || !price || !phone || !deletePin) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে সকল আবশ্যক ফিল্ড পূরণ করুন (* চিহ্নিত)।'
      });
    }

    const defaultPlaceholderImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
    const finalImages = Array.isArray(images) && images.length > 0 ? images : [defaultPlaceholderImage];

    // Find category key
    const matchedCategory = CATEGORIES_LIST.find(c => c.name === category);
    const categoryKey = matchedCategory ? matchedCategory.id : 'other';

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `ad-${Date.now()}`;

    const newAd: Ad = {
      id: `ad-${Date.now()}`,
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim(),
      condition: condition === 'new' ? 'new' : 'used',
      category: category.trim(),
      categoryKey,
      model: model ? model.trim() : undefined,
      division: division.trim(),
      district: district.trim(),
      upazila: upazila.trim(),
      description: description.trim(),
      price: Number(price) || 0,
      isNegotiable: Boolean(isNegotiable),
      phone: phone.trim(),
      deletePin: String(deletePin).trim(),
      images: finalImages,
      featured: false,
      featuredSpecs: featuredSpecs || undefined,
      sellerName: sellerName ? sellerName.trim() : 'বিক্রেতা',
      sellerPhone: phone.trim(),
      sellerWhatsApp: phone.trim().replace(/[^0-9+]/g, ''),
      postedAt: 'এইমাত্র',
      views: 1,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Prepend to database
    adsDatabase.unshift(newAd);

    res.status(201).json({
      success: true,
      message: 'আপনার বিজ্ঞাপনটি সফলভাবে পোস্ট হয়েছে!',
      data: newAd
    });
  });

  // Delete Ad (Requires correct 4-digit PIN)
  app.delete('/api/ads/:id', (req: Request, res: Response) => {
    const { pin } = req.body;
    const { id } = req.params;

    const adIndex = adsDatabase.findIndex(a => a.id === id || a.slug === id);
    if (adIndex === -1) {
      return res.status(404).json({ success: false, message: 'বিজ্ঞাপন পাওয়া যায়নি।' });
    }

    const ad = adsDatabase[adIndex];
    if (ad.deletePin !== String(pin).trim() && pin !== siteSettings.adminPin) {
      return res.status(403).json({
        success: false,
        message: 'ভুল পিন কোড! সঠিক ডিলিট পিন কোড প্রদান করুন।'
      });
    }

    adsDatabase.splice(adIndex, 1);
    // Also delete associated messages
    chatMessagesDatabase = chatMessagesDatabase.filter(m => m.adId !== id);

    res.json({
      success: true,
      message: 'বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে।'
    });
  });

  // Chat Messages API
  app.get('/api/messages/:adId', (req: Request, res: Response) => {
    const { adId } = req.params;
    const messages = chatMessagesDatabase.filter(m => m.adId === adId);
    res.json({ success: true, data: messages });
  });

  app.post('/api/messages/:adId', (req: Request, res: Response) => {
    const { adId } = req.params;
    const { text, imageUrl, senderName, isSeller } = req.body;

    if (!text && !imageUrl) {
      return res.status(400).json({ success: false, message: 'বার্তা লিখুন বা ছবি নির্বাচন করুন।' });
    }

    const targetAd = adsDatabase.find(a => a.id === adId || a.slug === adId);

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      adId,
      adTitle: targetAd ? targetAd.title : 'বিজ্ঞাপন',
      senderId: isSeller ? 'seller' : 'buyer',
      senderName: senderName || (isSeller ? 'বিক্রেতা' : 'ক্রেতা'),
      isSeller: Boolean(isSeller),
      text: text ? text.trim() : '',
      imageUrl: imageUrl || undefined,
      createdAt: new Date().toISOString()
    };

    chatMessagesDatabase.push(newMessage);

    res.status(201).json({
      success: true,
      message: 'বার্তা পাঠানো হয়েছে!',
      data: newMessage
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BechoKino classifieds server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server initialization error:', err);
});
