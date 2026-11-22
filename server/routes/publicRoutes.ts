import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { ensureDatabaseReady, getPlatformSettingsMap, isDbConfigured, queryRows } from '../db';

const router = Router();

// Public verified & active tailors directory from MySQL
router.get('/tailors', async (req, res: Response, next: NextFunction) => {
  try {
    if (!isDbConfigured()) {
      res.status(503).json({ error: 'Database not configured', code: 'DB_NOT_CONFIGURED' });
      return;
    }
    await ensureDatabaseReady();

    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const locality = typeof req.query.locality === 'string' ? req.query.locality.trim() : '';

    const tailors = await queryRows<RowDataPacket[]>(
      `SELECT tp.id, tp.shop_name, tp.master_tailor, tp.bio, tp.locality, tp.address,
              tp.specialties_json, tp.working_hours, tp.experience_years, tp.home_visit_fee,
              tp.pickup_available, tp.is_available, tp.is_verified, tp.rating,
              tp.total_reviews, tp.completed_orders, u.phone, u.email
       FROM tailor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE u.status = 'active'
         AND (? = '' OR tp.shop_name LIKE ? OR tp.master_tailor LIKE ? OR tp.locality LIKE ? OR tp.bio LIKE ?)
         AND (? = '' OR tp.locality LIKE ?)
       ORDER BY tp.is_verified DESC, tp.is_available DESC, tp.rating DESC, tp.completed_orders DESC`,
      [
        search,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        locality,
        `%${locality}%`,
      ],
    );

    const services = await queryRows<RowDataPacket[]>(
      `SELECT id, tailor_id, title, category, description, base_price, turnaround_days
       FROM services
       WHERE is_active = 1
       ORDER BY base_price ASC`,
    );

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

    const formatted = tailors.map((t) => {
      let specialties: string[] = [];
      try {
        specialties =
          typeof t.specialties_json === 'string'
            ? JSON.parse(t.specialties_json)
            : Array.isArray(t.specialties_json)
              ? t.specialties_json
              : [];
      } catch {
        specialties = [];
      }
      const ownServices = servicesByTailor.get(Number(t.id)) || [];
      return {
        id: Number(t.id),
        shopName: String(t.shop_name),
        masterTailor: String(t.master_tailor),
        bio: t.bio ? String(t.bio) : '',
        locality: String(t.locality),
        address: t.address ? String(t.address) : '',
        specialties,
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
        services: (ownServices.length > 0 ? ownServices : platformServices).map((sv) => ({
          id: Number(sv.id),
          tailorId: sv.tailor_id ? Number(sv.tailor_id) : null,
          title: String(sv.title),
          category: String(sv.category),
          description: sv.description ? String(sv.description) : '',
          basePrice: Number(sv.base_price),
          turnaroundDays: Number(sv.turnaround_days),
        })),
      };
    });

    res.json({ tailors: formatted, platformServices });
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

export default router;
