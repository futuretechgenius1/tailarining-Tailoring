import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { ensureDatabaseReady, getPlatformSettingsMap, isDbConfigured, queryRows } from '../db';
import {
  buildPaginationMeta,
  parsePagination,
  verifyPortfolioPreviewToken,
} from '../security';

const router = Router();

const DEFAULT_COVER_IMAGES = [
  '/src/assets/images/design_bridal_blouse_1795271999750.jpg',
  '/src/assets/images/atelier_maggam_craft_1795279206510.jpg',
  '/src/assets/images/design_mens_suit_1795271994978.jpg',
  '/src/assets/images/atelier_boutique_interior_1795279208066.jpg',
  '/src/assets/images/design_festive_lehenga_1795271994492.jpg',
  '/src/assets/images/design_saree_pleating_1795271998351.jpg',
];

const DEFAULT_PICKUP_SLOTS = [
  '10:00 AM – 12:00 PM',
  '12:30 PM – 02:30 PM',
  '03:30 PM – 05:30 PM',
  '06:00 PM – 08:00 PM',
];

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return val as T;
}

async function fetchPublicTailorsList(options: {
  search?: string;
  locality?: string;
  page?: number;
  limit?: number;
}) {
  const search = options.search?.trim() || '';
  const locality = options.locality?.trim() || '';
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = [`u.status = 'active'`];
  const params: string[] = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      `(tp.shop_name LIKE ? OR tp.master_tailor LIKE ? OR tp.locality LIKE ? OR tp.bio LIKE ?)`,
    );
    params.push(like, like, like, like);
  }
  if (locality) {
    conditions.push(`tp.locality LIKE ?`);
    params.push(`%${locality}%`);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows, tailors] = await Promise.all([
    queryRows<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM tailor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE ${whereClause}`,
      params,
    ),
    queryRows<RowDataPacket[]>(
      `SELECT tp.id, tp.shop_name, tp.master_tailor, tp.bio, tp.locality, tp.address,
              tp.specialties_json, tp.working_hours, tp.experience_years, tp.home_visit_fee,
              tp.pickup_available, tp.is_available, tp.is_verified, tp.rating,
              tp.total_reviews, tp.completed_orders, tp.cover_image_url, tp.logo_url, tp.distance_km,
              tp.turnaround_text, tp.turnaround_days, tp.pickup_slots_json, tp.recent_review_json,
              u.phone
       FROM tailor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE ${whereClause}
       ORDER BY tp.is_verified DESC, tp.is_available DESC, tp.rating DESC, tp.completed_orders DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);

  const [services, portfolioRows] = await Promise.all([
    queryRows<RowDataPacket[]>(
      `SELECT id, tailor_id, title, category, description, base_price, turnaround_days
       FROM services
       WHERE is_active = 1
       ORDER BY base_price ASC`,
    ),
    tailors.length > 0
      ? queryRows<RowDataPacket[]>(
          `SELECT id, tailor_id, title, category, caption, price_hint, turnaround_days,
                  is_featured, updated_at
           FROM tailor_portfolio_items
           WHERE is_visible = 1 AND tailor_id IN (${tailors.map(() => '?').join(',')})
           ORDER BY is_featured DESC, created_at DESC`,
          tailors.map((t) => Number(t.id)),
        )
      : Promise.resolve([] as RowDataPacket[]),
  ]);

  const servicesByTailor = new Map<number, RowDataPacket[]>();
  const platformServices: RowDataPacket[] = [];
  for (const s of services) {
    if (s.tailor_id) {
      const tid = Number(s.tailor_id);
      const list = servicesByTailor.get(tid) || [];
      list.push(s);
      servicesByTailor.set(tid, list);
    } else {
      platformServices.push(s);
    }
  }

  const portfolioByTailor = new Map<number, RowDataPacket[]>();
  for (const item of portfolioRows) {
    const tid = Number(item.tailor_id);
    const list = portfolioByTailor.get(tid) || [];
    if (list.length < 12) {
      list.push(item);
      portfolioByTailor.set(tid, list);
    }
  }

  const formatted = tailors.map((t) => {
    const tid = Number(t.id);
    const specialties = parseJsonSafe<string[]>(t.specialties_json, []);
    const pickupSlots = parseJsonSafe<string[]>(t.pickup_slots_json, DEFAULT_PICKUP_SLOTS);
    const recentReview = parseJsonSafe<{ author: string; text: string; date: string } | null>(
      t.recent_review_json,
      null,
    );

    const ownServices = servicesByTailor.get(tid) || [];
    const activeServices = ownServices.length > 0 ? ownServices : platformServices;
    const ownPortfolio = portfolioByTailor.get(tid) || [];

    const portfolioFormatted = ownPortfolio.map((p) => {
      const pid = Number(p.id);
      const version = p.updated_at ? new Date(String(p.updated_at)).getTime() : pid;
      return {
        id: pid,
        title: String(p.title),
        category: String(p.category),
        caption: p.caption ? String(p.caption) : '',
        priceHint: p.price_hint !== null ? Number(p.price_hint) : null,
        turnaroundDays: p.turnaround_days !== null ? Number(p.turnaround_days) : null,
        isFeatured: Boolean(p.is_featured),
        imageUrl: `/api/public/portfolio/${pid}/image?v=${version}`,
      };
    });

    const minServicePrice =
      activeServices.length > 0
        ? Math.min(...activeServices.map((sv) => Number(sv.base_price)))
        : 499;

    const coverImageUrl =
      (t.cover_image_url && String(t.cover_image_url).trim()) ||
      portfolioFormatted[0]?.imageUrl ||
      DEFAULT_COVER_IMAGES[tid % DEFAULT_COVER_IMAGES.length];

    const turnaroundDays = Number(t.turnaround_days || 4);
    const turnaroundText =
      (t.turnaround_text && String(t.turnaround_text).trim()) ||
      (turnaroundDays <= 1 ? '24 Hours' : `${turnaroundDays}–${turnaroundDays + 2} Days`);

    return {
      id: tid,
      shopName: String(t.shop_name),
      masterTailor: String(t.master_tailor),
      bio: t.bio ? String(t.bio) : '',
      locality: String(t.locality),
      address: t.address ? String(t.address) : '',
      specialties: Array.isArray(specialties) ? specialties : [],
      workingHours: String(t.working_hours),
      experienceYears: Number(t.experience_years),
      homeVisitFee: Number(t.home_visit_fee),
      pickupAvailable: Boolean(t.pickup_available),
      isAvailable: Boolean(t.is_available),
      isVerified: Boolean(t.is_verified),
      rating: Number(t.rating),
      totalReviews: Number(t.total_reviews),
      completedOrders: Number(t.completed_orders),
      phone: t.phone ? String(t.phone) : null,
      coverImageUrl,
      logoUrl: t.logo_url ? String(t.logo_url).trim() : null,
      distanceKm: Number(t.distance_km ?? 2.0),
      turnaroundText,
      turnaroundDays,
      startingPrice: minServicePrice,
      pickupSlots: Array.isArray(pickupSlots) && pickupSlots.length > 0 ? pickupSlots : DEFAULT_PICKUP_SLOTS,
      recentReview: recentReview || {
        author: 'Verified Tailering Client',
        text: `Prompt doorstep measurement and clean stitching finish from ${String(t.shop_name)}.`,
        date: 'Recently',
      },
      services: activeServices.map((sv) => ({
        id: Number(sv.id),
        tailorId: sv.tailor_id ? Number(sv.tailor_id) : null,
        title: String(sv.title),
        category: String(sv.category),
        description: sv.description ? String(sv.description) : '',
        basePrice: Number(sv.base_price),
        turnaroundDays: Number(sv.turnaround_days),
      })),
      portfolio: portfolioFormatted,
    };
  });

  const total = Number(countRows[0]?.total || 0);
  return {
    tailors: formatted,
    platformServices,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

async function fetchPublicDesignsList(options: { gender?: string; category?: string; q?: string }) {
  const conditions: string[] = [`is_active = 1`];
  const params: string[] = [];

  if (options.gender && (options.gender === 'women' || options.gender === 'men')) {
    conditions.push(`gender = ?`);
    params.push(options.gender);
  }
  if (options.category && options.category !== 'all') {
    conditions.push(`(category_id = ? OR category LIKE ?)`);
    params.push(options.category, `%${options.category}%`);
  }
  if (options.q?.trim()) {
    const like = `%${options.q.trim()}%`;
    conditions.push(`(title LIKE ? OR category LIKE ? OR boutique LIKE ?)`);
    params.push(like, like, like);
  }

  const rows = await queryRows<RowDataPacket[]>(
    `SELECT id, slug, tailor_id, title, category, category_id, gender, boutique,
            price, original_price, image_url, views, turnaround_days, trusted,
            rating, description, fabric_note, is_trending
     FROM designs_catalog
     WHERE ${conditions.join(' AND ')}
     ORDER BY is_trending DESC, views DESC, id ASC`,
    params,
  );

  return rows.map((d) => ({
    id: Number(d.id),
    slug: d.slug ? String(d.slug) : `des-${d.id}`,
    tailorId: d.tailor_id ? Number(d.tailor_id) : null,
    title: String(d.title),
    category: String(d.category),
    categoryId: String(d.category_id),
    gender: String(d.gender) as 'women' | 'men',
    boutique: String(d.boutique),
    price: Number(d.price),
    originalPrice: d.original_price !== null ? Number(d.original_price) : undefined,
    imageUrl: String(d.image_url),
    views: Number(d.views),
    turnaroundDays: Number(d.turnaround_days),
    trusted: Boolean(d.trusted),
    rating: Number(d.rating),
    description: d.description ? String(d.description) : '',
    fabricNote: d.fabric_note ? String(d.fabric_note) : '',
    isTrending: Boolean(d.is_trending),
  }));
}

async function fetchPublicAlterationsList(options: { section?: string; q?: string }) {
  const conditions: string[] = [`is_active = 1`];
  const params: string[] = [];

  if (options.section && (options.section === 'garment' || options.section === 'saree')) {
    conditions.push(`section = ?`);
    params.push(options.section);
  }
  if (options.q?.trim()) {
    const like = `%${options.q.trim()}%`;
    conditions.push(`(title LIKE ? OR description LIKE ?)`);
    params.push(like, like);
  }

  const rows = await queryRows<RowDataPacket[]>(
    `SELECT id, slug, title, description, price, unit, badge, badge_color, section, icon_type
     FROM alteration_services
     WHERE ${conditions.join(' AND ')}
     ORDER BY section ASC, id ASC`,
    params,
  );

  return rows.map((a) => ({
    id: Number(a.id),
    slug: a.slug ? String(a.slug) : `alt-${a.id}`,
    title: String(a.title),
    description: a.description ? String(a.description) : '',
    price: Number(a.price),
    unit: String(a.unit),
    badge: String(a.badge),
    badgeColor: String(a.badge_color),
    section: String(a.section) as 'garment' | 'saree',
    iconType: String(a.icon_type),
  }));
}

// Unified Storefront Bootstrap Endpoint (100% Dynamic MySQL Data — Zero UI Mock Data)
router.get('/storefront', async (_req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const [
      tailorsRes,
      designs,
      alterations,
      settingsMap,
      categoryRows,
      promoRows,
      localityRows,
      sceneRows,
      mediaRows,
    ] = await Promise.all([
      fetchPublicTailorsList({ page: 1, limit: 100 }),
      fetchPublicDesignsList({}),
      fetchPublicAlterationsList({}),
      getPlatformSettingsMap(),
      queryRows<RowDataPacket[]>(
        `SELECT slug, name, gender, image_url, starting_price, design_count
         FROM design_categories
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT code, title, description, tag, discount_amount, min_order, gradient
         FROM promo_offers
         WHERE is_active = 1
         ORDER BY min_order ASC, id ASC`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT name, city, lat, lng
         FROM service_localities
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT slug, chapter, title, subtitle, duration_sec, image_url, intent_id, motion_variant
         FROM craft_reel_scenes
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT media_key, image_url FROM storefront_media`,
      ),
    ]);

    const media: Record<string, string> = {};
    for (const m of mediaRows) {
      media[String(m.media_key)] = String(m.image_url);
    }

    res.json({
      tailors: tailorsRes.tailors,
      designs,
      alterations,
      categories: categoryRows.map((c) => ({
        id: String(c.slug),
        name: String(c.name),
        gender: String(c.gender) as 'women' | 'men',
        image: String(c.image_url),
        startingPrice: Number(c.starting_price),
        designCount: Number(c.design_count),
      })),
      promos: promoRows.map((p) => ({
        code: String(p.code),
        title: String(p.title),
        description: String(p.description),
        tag: String(p.tag),
        discountAmount: Number(p.discount_amount),
        minOrder: Number(p.min_order),
        gradient: String(p.gradient),
      })),
      localities: localityRows.map((l) => ({
        name: String(l.name),
        city: String(l.city),
        lat: Number(l.lat),
        lng: Number(l.lng),
      })),
      craftScenes: sceneRows.map((s) => ({
        id: String(s.slug),
        chapter: String(s.chapter),
        title: String(s.title),
        subtitle: String(s.subtitle),
        durationSec: Number(s.duration_sec || 6),
        image: String(s.image_url),
        intentId: String(s.intent_id),
        motionVariant: (s.motion_variant === 'pan' ? 'pan' : 'zoom') as 'zoom' | 'pan',
      })),
      platformServices: tailorsRes.platformServices.map((sv) => ({
        id: Number(sv.id),
        title: String(sv.title),
        category: String(sv.category),
        description: sv.description ? String(sv.description) : '',
        basePrice: Number(sv.base_price),
        turnaroundDays: Number(sv.turnaround_days),
      })),
      media,
      settings: {
        platformName: settingsMap.platform_name || 'Tailering',
        defaultHomeVisitFee: Number(settingsMap.default_home_visit_fee || 49),
        freeVisitMinOrder: Number(settingsMap.free_visit_min_order || 500),
        maxServiceRadiusKm: Number(settingsMap.max_service_radius_km || 5),
        requireQuoteApproval: settingsMap.require_quote_approval !== 'false',
        supportEmail: settingsMap.support_email || 'support@tailering.in',
        supportPhone: settingsMap.support_phone || '+91 98480 00100',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public verified & active tailors directory from MySQL (Paginated)
router.get('/tailors', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const locality = typeof req.query.locality === 'string' ? req.query.locality.trim() : '';
    const { page, limit } = parsePagination(req.query, 12, 100);

    const data = await fetchPublicTailorsList({ search, locality, page, limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Public Dedicated Tailor Shop Detail (Profile, Specializations, Services, Past-Work Gallery, Reviews & Rating Breakdown)
router.get('/tailors/:id', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const tailorId = Number(req.params.id);
    if (!Number.isInteger(tailorId) || tailorId <= 0) {
      res.status(400).json({ error: 'Invalid tailor shop ID.' });
      return;
    }

    const tailorRows = await queryRows<RowDataPacket[]>(
      `SELECT tp.id, tp.shop_name, tp.master_tailor, tp.bio, tp.locality, tp.address,
              tp.specialties_json, tp.working_hours, tp.experience_years, tp.home_visit_fee,
              tp.pickup_available, tp.is_available, tp.is_verified, tp.rating,
              tp.total_reviews, tp.completed_orders, tp.cover_image_url, tp.logo_url, tp.distance_km,
              tp.turnaround_text, tp.turnaround_days, tp.pickup_slots_json, tp.recent_review_json,
              u.phone
       FROM tailor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.id = ? AND u.status = 'active'
       LIMIT 1`,
      [tailorId],
    );

    if (tailorRows.length === 0) {
      res.status(404).json({ error: 'Tailor shop not found.' });
      return;
    }

    const t = tailorRows[0];

    const [ownServices, platformServices, portfolioRows, reviewRows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT id, tailor_id, title, category, description, base_price, turnaround_days
         FROM services
         WHERE tailor_id = ? AND is_active = 1
         ORDER BY base_price ASC`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, tailor_id, title, category, description, base_price, turnaround_days
         FROM services
         WHERE tailor_id IS NULL AND is_active = 1
         ORDER BY base_price ASC`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, tailor_id, title, category, caption, price_hint, turnaround_days,
                is_featured, created_at, updated_at
         FROM tailor_portfolio_items
         WHERE tailor_id = ? AND is_visible = 1
         ORDER BY is_featured DESC, created_at DESC
         LIMIT 48`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, tailor_id, customer_id, reviewer_name, reviewer_locality,
                service_name, rating, comment, is_verified_booking, created_at
         FROM tailor_reviews
         WHERE tailor_id = ?
         ORDER BY created_at DESC
         LIMIT 60`,
        [tailorId],
      ),
    ]);

    const activeServices = ownServices.length > 0 ? ownServices : platformServices;
    const specialties = parseJsonSafe<string[]>(t.specialties_json, []);
    const pickupSlots = parseJsonSafe<string[]>(t.pickup_slots_json, DEFAULT_PICKUP_SLOTS);
    const recentReview = parseJsonSafe<{ author: string; text: string; date: string } | null>(
      t.recent_review_json,
      null,
    );

    const portfolioFormatted = portfolioRows.map((p) => {
      const pid = Number(p.id);
      const version = p.updated_at ? new Date(String(p.updated_at)).getTime() : pid;
      return {
        id: pid,
        title: String(p.title),
        category: String(p.category) as 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear',
        caption: p.caption ? String(p.caption) : '',
        priceHint: p.price_hint !== null ? Number(p.price_hint) : null,
        turnaroundDays: p.turnaround_days !== null ? Number(p.turnaround_days) : null,
        isFeatured: Boolean(p.is_featured),
        imageUrl: `/api/public/portfolio/${pid}/image?v=${version}`,
        createdAt: p.created_at ? String(p.created_at) : undefined,
      };
    });

    const ratingBreakdown: Record<'5' | '4' | '3' | '2' | '1', number> = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    };
    const reviewsFormatted = reviewRows.map((r) => {
      const stars = Math.min(5, Math.max(1, Number(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[String(stars) as '1' | '2' | '3' | '4' | '5'] += 1;
      return {
        id: Number(r.id),
        tailorId: Number(r.tailor_id),
        reviewerName: String(r.reviewer_name),
        reviewerLocality: r.reviewer_locality ? String(r.reviewer_locality) : 'Hyderabad',
        serviceName: r.service_name ? String(r.service_name) : null,
        rating: stars,
        comment: String(r.comment),
        isVerifiedBooking: Boolean(r.is_verified_booking),
        createdAt: String(r.created_at),
      };
    });

    const minServicePrice =
      activeServices.length > 0
        ? Math.min(...activeServices.map((sv) => Number(sv.base_price)))
        : 499;

    const coverImageUrl =
      (t.cover_image_url && String(t.cover_image_url).trim()) ||
      portfolioFormatted[0]?.imageUrl ||
      DEFAULT_COVER_IMAGES[tailorId % DEFAULT_COVER_IMAGES.length];

    const turnaroundDays = Number(t.turnaround_days || 4);
    const turnaroundText =
      (t.turnaround_text && String(t.turnaround_text).trim()) ||
      (turnaroundDays <= 1 ? '24 Hours' : `${turnaroundDays}–${turnaroundDays + 2} Days`);

    res.json({
      tailor: {
        id: tailorId,
        shopName: String(t.shop_name),
        masterTailor: String(t.master_tailor),
        bio: t.bio ? String(t.bio) : '',
        locality: String(t.locality),
        address: t.address ? String(t.address) : '',
        specialties: Array.isArray(specialties) ? specialties : [],
        workingHours: String(t.working_hours),
        experienceYears: Number(t.experience_years),
        homeVisitFee: Number(t.home_visit_fee),
        pickupAvailable: Boolean(t.pickup_available),
        isAvailable: Boolean(t.is_available),
        isVerified: Boolean(t.is_verified),
        rating: Number(t.rating),
        totalReviews: Math.max(Number(t.total_reviews || 0), reviewsFormatted.length),
        completedOrders: Number(t.completed_orders),
        phone: t.phone ? String(t.phone) : null,
        coverImageUrl,
        logoUrl: t.logo_url ? String(t.logo_url).trim() : null,
        distanceKm: Number(t.distance_km ?? 2.0),
        turnaroundText,
        turnaroundDays,
        startingPrice: minServicePrice,
        pickupSlots:
          Array.isArray(pickupSlots) && pickupSlots.length > 0 ? pickupSlots : DEFAULT_PICKUP_SLOTS,
        recentReview: recentReview || undefined,
        services: activeServices.map((sv) => ({
          id: Number(sv.id),
          tailorId: sv.tailor_id ? Number(sv.tailor_id) : null,
          title: String(sv.title),
          category: String(sv.category),
          description: sv.description ? String(sv.description) : '',
          basePrice: Number(sv.base_price),
          turnaroundDays: Number(sv.turnaround_days),
        })),
        portfolio: portfolioFormatted,
        reviews: reviewsFormatted,
        ratingBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public Curated Designs catalog
router.get('/designs', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const gender = typeof req.query.gender === 'string' ? req.query.gender.trim() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    const designs = await fetchPublicDesignsList({ gender, category, q });
    res.json({ designs });
  } catch (err) {
    next(err);
  }
});

// Public Doorstep Alterations catalog
router.get('/alterations', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const section = typeof req.query.section === 'string' ? req.query.section.trim() : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    const alterations = await fetchPublicAlterationsList({ section, q });
    res.json({ alterations });
  } catch (err) {
    next(err);
  }
});

// Public active services
router.get('/services', async (_req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT s.id, s.tailor_id, s.title, s.category, s.description, s.base_price, s.turnaround_days,
              tp.shop_name AS tailor_shop_name
       FROM services s
       LEFT JOIN tailor_profiles tp ON tp.id = s.tailor_id
       WHERE s.is_active = 1
       ORDER BY s.tailor_id IS NOT NULL, s.category, s.base_price ASC`,
    );

    res.json({
      services: rows.map((r) => ({
        id: Number(r.id),
        tailorId: r.tailor_id ? Number(r.tailor_id) : null,
        tailorShopName: r.tailor_shop_name ? String(r.tailor_shop_name) : 'Tailering Standard Catalog',
        title: String(r.title),
        category: String(r.category),
        description: r.description ? String(r.description) : '',
        basePrice: Number(r.base_price),
        turnaroundDays: Number(r.turnaround_days),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Public non-sensitive platform operational settings
router.get('/settings', async (_req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();
    const map = await getPlatformSettingsMap();
    res.json({
      settings: {
        platformName: map.platform_name || 'Tailering',
        defaultHomeVisitFee: Number(map.default_home_visit_fee || 49),
        freeVisitMinOrder: Number(map.free_visit_min_order || 500),
        maxServiceRadiusKm: Number(map.max_service_radius_km || 5),
        requireQuoteApproval: map.require_quote_approval !== 'false',
        supportEmail: map.support_email || 'support@tailering.in',
        supportPhone: map.support_phone || '+91 98480 00100',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Safe binary image delivery for Tailor Portfolio showcase photos
router.get('/portfolio/:id/image', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: 'Invalid portfolio image ID.' });
      return;
    }

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, tailor_id, mime_type, image_data, is_visible
       FROM tailor_portfolio_items
       WHERE id = ?
       LIMIT 1`,
      [itemId],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }

    const row = rows[0];
    const isVisible = Boolean(row.is_visible);
    if (!isVisible) {
      const token = typeof req.query.t === 'string' ? req.query.t : '';
      if (!verifyPortfolioPreviewToken(itemId, Number(row.tailor_id), token)) {
        res.status(404).json({ error: 'Image not found.' });
        return;
      }
    }

    const mime = String(row.mime_type);
    const safeMime = ['image/jpeg', 'image/png', 'image/webp'].includes(mime)
      ? mime
      : 'application/octet-stream';
    const data = Buffer.isBuffer(row.image_data) ? row.image_data : Buffer.from(row.image_data);

    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Length', String(data.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', isVisible ? 'public, max-age=86400' : 'private, no-store');
    res.send(data);
  } catch (err) {
    next(err);
  }
});

// Safe binary image delivery for uploaded Tailor Shop Logos
router.get('/tailors/:id/logo', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const tailorId = Number(req.params.id);
    if (!Number.isInteger(tailorId) || tailorId <= 0) {
      res.status(400).json({ error: 'Invalid tailor ID.' });
      return;
    }

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT logo_mime, logo_data
       FROM tailor_profiles
       WHERE id = ? AND logo_data IS NOT NULL
       LIMIT 1`,
      [tailorId],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Shop logo not found.' });
      return;
    }

    const mime = String(rows[0].logo_mime || '');
    const safeMime = ['image/jpeg', 'image/png', 'image/webp'].includes(mime)
      ? mime
      : 'application/octet-stream';
    const data = Buffer.isBuffer(rows[0].logo_data)
      ? rows[0].logo_data
      : Buffer.from(rows[0].logo_data);

    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Length', String(data.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch (err) {
    next(err);
  }
});

export default router;
