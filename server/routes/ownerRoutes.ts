import { Router, Response, NextFunction } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthedRequest, hashPassword, requireAuth, requireRole } from '../auth';
import { executeSql, queryRows, withTransaction } from '../db';
import {
  ALLOWED_PORTFOLIO_MIMES,
  buildPaginationMeta,
  createRateLimiter,
  parsePagination,
  strongPasswordSchema,
  validatePortfolioImageBuffer,
} from '../security';

const router = Router();
router.use(requireAuth, requireRole('owner'));

const ORDER_STATUSES = [
  'Booking Created',
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Customer Approved',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
  'Cancelled',
] as const;

// 1. OWNER OVERVIEW & LIVE PLATFORM KPIs
router.get('/overview', async (_req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const [[userStats]] = await Promise.all([
      queryRows<RowDataPacket[]>(`
        SELECT
          COUNT(*) AS total_users,
          SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS total_customers,
          SUM(CASE WHEN role = 'tailor' THEN 1 ELSE 0 END) AS total_tailors,
          SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) AS total_owners,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_users
        FROM users
      `),
    ]);

    const [tailorStatsRows, orderStatsRows, paymentStatsRows, recentOrders, topTailors] =
      await Promise.all([
        queryRows<RowDataPacket[]>(`
          SELECT
            COUNT(*) AS total_shops,
            SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified_shops,
            SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) AS available_shops
          FROM tailor_profiles
        `),
        queryRows<RowDataPacket[]>(`
          SELECT
            COUNT(*) AS total_orders,
            SUM(CASE WHEN status NOT IN ('Delivered', 'Cancelled') THEN 1 ELSE 0 END) AS active_orders,
            SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
            SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS total_gmv,
            COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN platform_commission ELSE 0 END), 0) AS total_commission
          FROM orders
        `),
        queryRows<RowDataPacket[]>(`
          SELECT
            COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) AS collected_revenue,
            COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_collections,
            COALESCE(SUM(CASE WHEN payment_status = 'completed' AND payout_status = 'unsettled' THEN tailor_earning ELSE 0 END), 0) AS pending_payouts,
            COALESCE(SUM(CASE WHEN payout_status = 'settled' THEN tailor_earning ELSE 0 END), 0) AS settled_payouts
          FROM payments
        `),
        queryRows<RowDataPacket[]>(`
          SELECT o.id, o.order_code, o.service_title, o.status, o.total_amount, o.payment_status,
                 o.delivery_date, o.created_at, c.full_name AS customer_name, tp.shop_name AS tailor_name
          FROM orders o
          JOIN users c ON c.id = o.customer_id
          LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
          ORDER BY o.created_at DESC
          LIMIT 8
        `),
        queryRows<RowDataPacket[]>(`
          SELECT tp.id, tp.shop_name, tp.locality, tp.rating, tp.is_verified, tp.is_available,
                 COUNT(o.id) AS order_count,
                 COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS gross_volume
          FROM tailor_profiles tp
          LEFT JOIN orders o ON o.tailor_id = tp.id
          GROUP BY tp.id
          ORDER BY gross_volume DESC, order_count DESC
          LIMIT 5
        `),
      ]);

    const tStats = tailorStatsRows[0] || {};
    const oStats = orderStatsRows[0] || {};
    const pStats = paymentStatsRows[0] || {};

    res.json({
      kpis: {
        totalUsers: Number(userStats?.total_users || 0),
        totalCustomers: Number(userStats?.total_customers || 0),
        totalTailors: Number(userStats?.total_tailors || 0),
        activeUsers: Number(userStats?.active_users || 0),
        verifiedShops: Number(tStats.verified_shops || 0),
        availableShops: Number(tStats.available_shops || 0),
        totalOrders: Number(oStats.total_orders || 0),
        activeOrders: Number(oStats.active_orders || 0),
        deliveredOrders: Number(oStats.delivered_orders || 0),
        cancelledOrders: Number(oStats.cancelled_orders || 0),
        totalGmv: Number(oStats.total_gmv || 0),
        totalCommission: Number(oStats.total_commission || 0),
        collectedRevenue: Number(pStats.collected_revenue || 0),
        pendingCollections: Number(pStats.pending_collections || 0),
        pendingPayouts: Number(pStats.pending_payouts || 0),
        settledPayouts: Number(pStats.settled_payouts || 0),
      },
      recentOrders,
      topTailors,
    });
  } catch (err) {
    next(err);
  }
});

// 2. USERS & CUSTOMERS MANAGEMENT (Paginated)
router.get('/users', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (role) {
      conditions.push(`u.role = ?`);
      params.push(role);
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(`(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.locality LIKE ?)`);
      params.push(like, like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, params),
      queryRows<RowDataPacket[]>(
        `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.locality, u.address, u.created_at,
                COUNT(DISTINCT o.id) AS order_count,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
                tp.shop_name
         FROM users u
         LEFT JOIN orders o ON o.customer_id = u.id
         LEFT JOIN tailor_profiles tp ON tp.user_id = u.id
         ${whereClause}
         GROUP BY u.id, tp.shop_name
         ORDER BY u.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ users: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: strongPasswordSchema,
  role: z.enum(['owner', 'tailor', 'customer']),
  locality: z.string().trim().min(2).max(160).default('Alkapur Township, Manikonda'),
  shopName: z.string().trim().max(160).optional(),
});

router.post('/users', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid user data' });
      return;
    }

    const d = parsed.data;
    const emailNorm = d.email.toLowerCase();
    const phoneNorm = d.phone?.trim() ? d.phone.trim() : null;
    const passwordHash = await hashPassword(d.password);

    const newUserId = await withTransaction(async (conn) => {
      const [dup] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ? OR (? IS NOT NULL AND phone = ?) LIMIT 1`,
        [emailNorm, phoneNorm, phoneNorm],
      );
      if (dup.length > 0) {
        const err = new Error('Email or mobile number already exists.') as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }

      const [resInsert] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, locality)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        [d.fullName, emailNorm, phoneNorm, passwordHash, d.role, d.locality],
      );
      const uid = resInsert.insertId;

      if (d.role === 'tailor') {
        await conn.execute(
          `INSERT INTO tailor_profiles (user_id, shop_name, master_tailor, locality, specialties_json, is_verified, is_available)
           VALUES (?, ?, ?, ?, ?, 1, 1)`,
          [
            uid,
            d.shopName?.trim() || `${d.fullName} Tailors`,
            d.fullName,
            d.locality,
            JSON.stringify(['Custom Stitching', 'Alterations']),
          ],
        );
      }

      return uid;
    });

    res.status(201).json({ id: newUserId, message: 'User created successfully.' });
  } catch (err) {
    next(err);
  }
});

const patchUserSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  role: z.enum(['owner', 'tailor', 'customer']).optional(),
  locality: z.string().trim().min(2).max(160).optional(),
});

router.patch('/users/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }

    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update' });
      return;
    }

    if (targetId === req.user!.id && parsed.data.status === 'suspended') {
      res.status(400).json({ error: 'You cannot suspend your own App Owner account.' });
      return;
    }
    if (targetId === req.user!.id && parsed.data.role && parsed.data.role !== 'owner') {
      res.status(400).json({ error: 'You cannot demote your own App Owner role.' });
      return;
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE users
         SET status = COALESCE(?, status),
             role = COALESCE(?, role),
             locality = COALESCE(?, locality)
         WHERE id = ?`,
        [parsed.data.status ?? null, parsed.data.role ?? null, parsed.data.locality ?? null, targetId],
      );

      if (parsed.data.role === 'tailor') {
        const [uRows] = await conn.execute<RowDataPacket[]>(
          `SELECT full_name, locality FROM users WHERE id = ?`,
          [targetId],
        );
        if (uRows.length > 0) {
          await conn.execute(
            `INSERT IGNORE INTO tailor_profiles (user_id, shop_name, master_tailor, locality, specialties_json, is_verified, is_available)
             VALUES (?, ?, ?, ?, ?, 1, 1)`,
            [
              targetId,
              `${uRows[0].full_name} Atelier`,
              uRows[0].full_name,
              uRows[0].locality,
              JSON.stringify(['Custom Stitching', 'Alterations']),
            ],
          );
        }
      }
    });

    res.json({ message: 'User updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 3. TAILORS MANAGEMENT (Paginated + Search)
router.get('/tailors', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(`(tp.shop_name LIKE ? OR tp.master_tailor LIKE ? OR tp.locality LIKE ? OR u.email LIKE ?)`);
      params.push(like, like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM tailor_profiles tp
         JOIN users u ON u.id = tp.user_id
         ${whereClause}`,
        params,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT tp.id, tp.user_id, tp.shop_name, tp.master_tailor, tp.bio, tp.locality, tp.address,
                tp.specialties_json, tp.working_hours, tp.experience_years, tp.home_visit_fee,
                tp.pickup_available, tp.is_available, tp.is_verified, tp.commission_rate,
                tp.rating, tp.total_reviews, tp.completed_orders, tp.cover_image_url, tp.logo_url,
                tp.distance_km, tp.turnaround_text, tp.turnaround_days, tp.created_at, tp.updated_at,
                u.full_name, u.email, u.phone, u.status AS user_status,
                COUNT(DISTINCT o.id) AS total_orders,
                SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_count,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_gmv,
                COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.tailor_payout ELSE 0 END), 0) AS total_payout
         FROM tailor_profiles tp
         JOIN users u ON u.id = tp.user_id
         LEFT JOIN orders o ON o.tailor_id = tp.id
         ${whereClause}
         GROUP BY tp.id
         ORDER BY tp.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ tailors: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const safeImageUrlSchema = z
  .string()
  .trim()
  .max(255)
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('/') ||
      val.startsWith('https://') ||
      val.startsWith('http://'),
    'Image URL must be a relative path or http(s) URL.',
  );

const patchTailorSchema = z.object({
  shopName: z.string().trim().min(2).max(160).optional(),
  masterTailor: z.string().trim().min(2).max(120).optional(),
  locality: z.string().trim().min(2).max(160).optional(),
  bio: z.string().trim().max(1000).optional(),
  workingHours: z.string().trim().min(3).max(120).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  coverImageUrl: safeImageUrlSchema.optional(),
  logoUrl: safeImageUrlSchema.optional(),
  turnaroundText: z.string().trim().min(2).max(60).optional(),
  turnaroundDays: z.coerce.number().int().min(1).max(60).optional(),
  pickupAvailable: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  commissionRate: z.coerce.number().min(0).max(50).optional(),
  homeVisitFee: z.coerce.number().min(0).max(500).optional(),
});

router.patch('/tailors/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const tailorId = Number(req.params.id);
    if (!Number.isInteger(tailorId) || tailorId <= 0) {
      res.status(400).json({ error: 'Invalid tailor ID.' });
      return;
    }

    const parsed = patchTailorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update' });
      return;
    }

    const d = parsed.data;
    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT user_id, shop_name FROM tailor_profiles WHERE id = ? LIMIT 1`,
        [tailorId],
      );
      if (rows.length === 0) {
        const err = new Error('Tailor profile not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      await conn.execute(
        `UPDATE tailor_profiles
         SET shop_name = COALESCE(?, shop_name),
             master_tailor = COALESCE(?, master_tailor),
             locality = COALESCE(?, locality),
             bio = COALESCE(?, bio),
             working_hours = COALESCE(?, working_hours),
             experience_years = COALESCE(?, experience_years),
             cover_image_url = COALESCE(?, cover_image_url),
             logo_url = CASE WHEN ? THEN ? ELSE logo_url END,
             turnaround_text = COALESCE(?, turnaround_text),
             turnaround_days = COALESCE(?, turnaround_days),
             pickup_available = COALESCE(?, pickup_available),
             is_verified = COALESCE(?, is_verified),
             is_available = COALESCE(?, is_available),
             commission_rate = COALESCE(?, commission_rate),
             home_visit_fee = COALESCE(?, home_visit_fee)
         WHERE id = ?`,
        [
          d.shopName ?? null,
          d.masterTailor ?? null,
          d.locality ?? null,
          d.bio ?? null,
          d.workingHours ?? null,
          d.experienceYears ?? null,
          d.coverImageUrl !== undefined ? (d.coverImageUrl || null) : null,
          d.logoUrl !== undefined ? 1 : 0,
          d.logoUrl || null,
          d.turnaroundText ?? null,
          d.turnaroundDays ?? null,
          d.pickupAvailable !== undefined ? (d.pickupAvailable ? 1 : 0) : null,
          d.isVerified !== undefined ? (d.isVerified ? 1 : 0) : null,
          d.isAvailable !== undefined ? (d.isAvailable ? 1 : 0) : null,
          d.commissionRate ?? null,
          d.homeVisitFee ?? null,
          tailorId,
        ],
      );

      if (d.isVerified !== undefined) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category)
           VALUES (?, ?, ?, 'account')`,
          [
            rows[0].user_id,
            d.isVerified ? 'Atelier Verified by Tailering' : 'Verification Paused',
            d.isVerified
              ? `${rows[0].shop_name} has been verified by the App Owner and is featured to customers.`
              : `Verification badge for ${rows[0].shop_name} was paused by platform operations.`,
          ],
        );
      }
    });

    res.json({ message: 'Tailor partner updated successfully.' });
  } catch (err) {
    next(err);
  }
});

const ownerLogoUploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'owner-logo-upload',
  message: 'Too many logo upload requests. Please try again shortly.',
});

const ownerLogoSchema = z.object({
  mimeType: z.enum(ALLOWED_PORTFOLIO_MIMES),
  imageBase64: z.string().min(32).max(2_200_000),
});

router.post(
  '/tailors/:id/logo',
  ownerLogoUploadLimiter,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const tailorId = Number(req.params.id);
      if (!Number.isInteger(tailorId) || tailorId <= 0) {
        res.status(400).json({ error: 'Invalid tailor ID.' });
        return;
      }

      const parsed = ownerLogoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid logo upload.' });
        return;
      }

      const cleanedBase64 = parsed.data.imageBase64.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        '',
      );
      const imageBuffer = Buffer.from(cleanedBase64, 'base64');
      const check = validatePortfolioImageBuffer(imageBuffer, parsed.data.mimeType);
      if (!check.valid) {
        res.status(400).json({ error: check.reason || 'Unsupported logo image.' });
        return;
      }

      const logoUrl = `/api/public/tailors/${tailorId}/logo?v=${Date.now()}`;
      const result = await executeSql(
        `UPDATE tailor_profiles
         SET logo_url = ?, logo_mime = ?, logo_data = ?
         WHERE id = ?`,
        [logoUrl, parsed.data.mimeType, imageBuffer, tailorId],
      );
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Tailor profile not found.' });
        return;
      }

      res.json({ logoUrl, message: 'Tailor shop logo uploaded and published.' });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/tailors/:id/logo', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const tailorId = Number(req.params.id);
    if (!Number.isInteger(tailorId) || tailorId <= 0) {
      res.status(400).json({ error: 'Invalid tailor ID.' });
      return;
    }
    const result = await executeSql(
      `UPDATE tailor_profiles
       SET logo_url = NULL, logo_mime = NULL, logo_data = NULL
       WHERE id = ?`,
      [tailorId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Tailor profile not found.' });
      return;
    }
    res.json({ message: 'Tailor shop logo removed.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/tailors/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const tailorId = Number(req.params.id);
    if (!Number.isInteger(tailorId) || tailorId <= 0) {
      res.status(400).json({ error: 'Invalid tailor ID.' });
      return;
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT user_id FROM tailor_profiles WHERE id = ? LIMIT 1`,
        [tailorId],
      );
      if (rows.length === 0) {
        const err = new Error('Tailor profile not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }
      await conn.execute(`DELETE FROM tailor_profiles WHERE id = ?`, [tailorId]);
      await conn.execute(`UPDATE users SET status = 'suspended' WHERE id = ?`, [rows[0].user_id]);
    });

    res.json({ message: 'Tailor partner removed from storefront.' });
  } catch (err) {
    next(err);
  }
});

// 4. SERVICES CATALOG MANAGEMENT (CRUD + Paginated)
router.get('/services', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (category) {
      conditions.push(`s.category = ?`);
      params.push(category);
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(`(s.title LIKE ? OR s.description LIKE ? OR tp.shop_name LIKE ?)`);
      params.push(like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM services s
         LEFT JOIN tailor_profiles tp ON tp.id = s.tailor_id
         ${whereClause}`,
        params,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT s.*, tp.shop_name AS tailor_shop_name
         FROM services s
         LEFT JOIN tailor_profiles tp ON tp.id = s.tailor_id
         ${whereClause}
         ORDER BY s.tailor_id IS NOT NULL, s.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ services: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const serviceSchema = z.object({
  tailorId: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(2).max(160),
  category: z.enum(['custom', 'alteration', 'uniform', 'bridal', 'menswear']),
  description: z.string().trim().max(600).optional(),
  basePrice: z.coerce.number().min(10).max(500000),
  turnaroundDays: z.coerce.number().int().min(1).max(60).default(3),
  isActive: z.boolean().default(true),
});

router.post('/services', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service data' });
      return;
    }
    const d = parsed.data;
    const result = await executeSql(
      `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        d.tailorId ?? null,
        d.title,
        d.category,
        d.description || null,
        d.basePrice,
        d.turnaroundDays,
        d.isActive ? 1 : 0,
      ],
    );
    res.status(201).json({ id: result.insertId, message: 'Service created successfully.' });
  } catch (err) {
    next(err);
  }
});

router.patch('/services/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      res.status(400).json({ error: 'Invalid service ID.' });
      return;
    }
    const parsed = serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service update' });
      return;
    }
    const d = parsed.data;
    await executeSql(
      `UPDATE services
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           description = COALESCE(?, description),
           base_price = COALESCE(?, base_price),
           turnaround_days = COALESCE(?, turnaround_days),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        d.title ?? null,
        d.category ?? null,
        d.description ?? null,
        d.basePrice ?? null,
        d.turnaroundDays ?? null,
        d.isActive !== undefined ? (d.isActive ? 1 : 0) : null,
        serviceId,
      ],
    );
    res.json({ message: 'Service updated successfully.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/services/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      res.status(400).json({ error: 'Invalid service ID.' });
      return;
    }
    await executeSql(`DELETE FROM services WHERE id = ?`, [serviceId]);
    res.json({ message: 'Service removed.' });
  } catch (err) {
    next(err);
  }
});

// 5. ORDERS MANAGEMENT (Paginated)
router.get('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (status) {
      conditions.push(`o.status = ?`);
      params.push(status);
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        `(o.order_code LIKE ? OR o.service_title LIKE ? OR c.full_name LIKE ? OR tp.shop_name LIKE ?)`,
      );
      params.push(like, like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
         ${whereClause}`,
        params,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT o.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                tp.shop_name AS tailor_shop_name, tp.master_tailor
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ orders: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const patchOwnerOrderSchema = z.object({
  tailorId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  deliveryDate: z.string().trim().max(20).nullable().optional(),
  quotedAmount: z.coerce.number().min(0).max(500000).optional(),
  note: z.string().trim().max(240).optional(),
});

router.patch('/orders/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    const parsed = patchOwnerOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid order update' });
      return;
    }

    const d = parsed.data;

    await withTransaction(async (conn) => {
      const [existingRows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
        [orderId],
      );
      if (existingRows.length === 0) {
        const err = new Error('Order not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const ord = existingRows[0];
      const nextTailorId = d.tailorId !== undefined ? d.tailorId : ord.tailor_id;
      const nextStatus = d.status ?? String(ord.status);
      const nextQuoted = d.quotedAmount !== undefined ? d.quotedAmount : Number(ord.quoted_amount);
      const nextTotal = nextQuoted + Number(ord.visit_fee);

      let commissionPct = 12;
      if (nextTailorId) {
        const [tpRows] = await conn.execute<RowDataPacket[]>(
          `SELECT commission_rate, user_id FROM tailor_profiles WHERE id = ? LIMIT 1`,
          [nextTailorId],
        );
        if (tpRows.length > 0) {
          commissionPct = Number(tpRows[0].commission_rate);
        }
      }

      const commission = Number(((nextTotal * commissionPct) / 100).toFixed(2));
      const payout = Number((nextTotal - commission).toFixed(2));

      await conn.execute(
        `UPDATE orders
         SET tailor_id = ?,
             status = ?,
             delivery_date = CASE WHEN ? THEN ? ELSE delivery_date END,
             quoted_amount = ?,
             total_amount = ?,
             platform_commission = ?,
             tailor_payout = ?
         WHERE id = ?`,
        [
          nextTailorId ?? null,
          nextStatus,
          d.deliveryDate !== undefined ? 1 : 0,
          d.deliveryDate || null,
          nextQuoted,
          nextTotal,
          commission,
          payout,
          orderId,
        ],
      );

      // Keep pending payment row synced if amount or tailor changed
      await conn.execute(
        `UPDATE payments
         SET tailor_id = ?, amount = ?, platform_fee = ?, tailor_earning = ?
         WHERE order_id = ? AND payment_status = 'pending'`,
        [nextTailorId ?? null, nextTotal, commission, payout, orderId],
      );

      if (nextStatus !== ord.status) {
        await conn.execute(
          `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, ord.status, nextStatus, req.user!.id, d.note || 'Updated by App Owner'],
        );

        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'order', ?)`,
          [
            ord.customer_id,
            `Order ${ord.order_code}: ${nextStatus}`,
            d.note || `Your order status was updated to "${nextStatus}".`,
            orderId,
          ],
        );

        if (nextStatus === 'Delivered' && nextTailorId) {
          await conn.execute(
            `UPDATE tailor_profiles SET completed_orders = completed_orders + 1 WHERE id = ?`,
            [nextTailorId],
          );
        }
      }
    });

    res.json({ message: 'Order updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 6. PAYMENTS & SETTLEMENTS LEDGER (Paginated)
router.get('/payments', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 10, 50);
    const whereClause = status ? `WHERE p.payment_status = ?` : '';
    const params = status ? [status] : [];

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM payments p ${whereClause}`, params),
      queryRows<RowDataPacket[]>(
        `SELECT p.*, o.order_code, o.service_title, c.full_name AS customer_name, tp.shop_name AS tailor_shop_name
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         JOIN users c ON c.id = p.customer_id
         LEFT JOIN tailor_profiles tp ON tp.id = p.tailor_id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ payments: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const patchPaymentSchema = z.object({
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  payoutStatus: z.enum(['unsettled', 'scheduled', 'settled']).optional(),
  transactionRef: z.string().trim().max(120).optional(),
});

router.patch('/payments/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      res.status(400).json({ error: 'Invalid payment ID.' });
      return;
    }

    const parsed = patchPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment update' });
      return;
    }
    const d = parsed.data;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT p.*, o.order_code, tp.user_id AS tailor_user_id
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         LEFT JOIN tailor_profiles tp ON tp.id = p.tailor_id
         WHERE p.id = ? FOR UPDATE`,
        [paymentId],
      );
      if (rows.length === 0) {
        const err = new Error('Payment record not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const pay = rows[0];
      const nextPayStatus = d.paymentStatus ?? pay.payment_status;
      const nextPayoutStatus = d.payoutStatus ?? pay.payout_status;

      await conn.execute(
        `UPDATE payments
         SET payment_status = ?,
             payout_status = ?,
             transaction_ref = COALESCE(?, transaction_ref),
             paid_at = CASE WHEN ? = 1 AND paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE paid_at END,
             settled_at = CASE WHEN ? = 1 AND settled_at IS NULL THEN CURRENT_TIMESTAMP ELSE settled_at END
         WHERE id = ?`,
        [
          nextPayStatus,
          nextPayoutStatus,
          d.transactionRef ?? null,
          nextPayStatus === 'completed' ? 1 : 0,
          nextPayoutStatus === 'settled' ? 1 : 0,
          paymentId,
        ],
      );

      if (nextPayStatus === 'completed') {
        await conn.execute(`UPDATE orders SET payment_status = 'paid' WHERE id = ?`, [pay.order_id]);
      } else if (nextPayStatus === 'refunded') {
        await conn.execute(`UPDATE orders SET payment_status = 'refunded' WHERE id = ?`, [pay.order_id]);
      }

      if (nextPayoutStatus === 'settled' && pay.tailor_user_id) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'payment', ?)`,
          [
            pay.tailor_user_id,
            `Payout Settled (${pay.payment_code})`,
            `₹${Number(pay.tailor_earning).toLocaleString('en-IN')} for order ${pay.order_code} has been settled to your account.`,
            pay.order_id,
          ],
        );
      }
    });

    res.json({ message: 'Payment record updated.' });
  } catch (err) {
    next(err);
  }
});

// 7. REPORTS & ANALYTICS (Live SQL Aggregations)
router.get('/reports', async (_req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const [byCategory, byStatus, byLocality, tailorPerformance] = await Promise.all([
      queryRows<RowDataPacket[]>(`
        SELECT order_type AS category,
               COUNT(*) AS order_count,
               COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
        FROM orders
        GROUP BY order_type
        ORDER BY revenue DESC
      `),
      queryRows<RowDataPacket[]>(`
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
        ORDER BY count DESC
      `),
      queryRows<RowDataPacket[]>(`
        SELECT locality,
               COUNT(*) AS order_count,
               COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
        FROM orders
        GROUP BY locality
        ORDER BY order_count DESC
        LIMIT 8
      `),
      queryRows<RowDataPacket[]>(`
        SELECT tp.id, tp.shop_name, tp.locality, tp.rating, tp.commission_rate,
               COUNT(o.id) AS total_orders,
               SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
               COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS gross_revenue,
               COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.platform_commission ELSE 0 END), 0) AS commission_earned
        FROM tailor_profiles tp
        LEFT JOIN orders o ON o.tailor_id = tp.id
        GROUP BY tp.id
        ORDER BY gross_revenue DESC
      `),
    ]);

    res.json({ byCategory, byStatus, byLocality, tailorPerformance });
  } catch (err) {
    next(err);
  }
});

// 8. PLATFORM SETTINGS & CONFIGURATION
router.get('/settings', async (_req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT setting_key, setting_value, category, description, updated_at
       FROM platform_settings
       ORDER BY category, setting_key`,
    );
    res.json({ settings: rows });
  } catch (err) {
    next(err);
  }
});

const updateSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        value: z.string().trim().max(255),
      }),
    )
    .min(1),
});

router.put('/settings', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid settings payload' });
      return;
    }

    await withTransaction(async (conn) => {
      for (const item of parsed.data.settings) {
        await conn.execute(
          `UPDATE platform_settings
           SET setting_value = ?, updated_by = ?
           WHERE setting_key = ?`,
          [item.value, req.user!.id, item.key],
        );
      }
    });

    res.json({ message: 'Platform configuration saved.' });
  } catch (err) {
    next(err);
  }
});

// 9. CURATED DESIGNS CATALOG CRUD (Updates DesignsCatalogPage & Alterations carousel live)
router.get('/designs', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 12, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(`(title LIKE ? OR category LIKE ? OR boutique LIKE ?)`);
      params.push(like, like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM designs_catalog ${whereClause}`, params),
      queryRows<RowDataPacket[]>(
        `SELECT * FROM designs_catalog ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ designs: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const designSchema = z.object({
  title: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(80),
  categoryId: z.string().trim().min(2).max(60).default('blouse'),
  gender: z.enum(['women', 'men']).default('women'),
  boutique: z.string().trim().min(2).max(160).default('Tailering Master Atelier'),
  price: z.coerce.number().min(20).max(500000),
  originalPrice: z.coerce.number().min(20).max(500000).nullable().optional(),
  imageUrl: safeImageUrlSchema.refine((v) => v.length > 0, 'Image URL is required'),
  turnaroundDays: z.coerce.number().int().min(1).max(60).default(5),
  trusted: z.boolean().default(true),
  description: z.string().trim().max(1000).optional(),
  fabricNote: z.string().trim().max(500).optional(),
  isTrending: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

router.post('/designs', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = designSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid design data' });
      return;
    }
    const d = parsed.data;
    const slug = `des-${Date.now().toString(36)}`;
    const result = await executeSql(
      `INSERT INTO designs_catalog (
         slug, title, category, category_id, gender, boutique, price, original_price,
         image_url, turnaround_days, trusted, description, fabric_note, is_trending, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        d.title,
        d.category,
        d.categoryId,
        d.gender,
        d.boutique,
        d.price,
        d.originalPrice ?? null,
        d.imageUrl,
        d.turnaroundDays,
        d.trusted ? 1 : 0,
        d.description || '',
        d.fabricNote || '',
        d.isTrending ? 1 : 0,
        d.isActive ? 1 : 0,
      ],
    );
    res.status(201).json({ id: result.insertId, message: 'Design added to storefront catalog.' });
  } catch (err) {
    next(err);
  }
});

router.patch('/designs/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid design ID.' });
      return;
    }
    const parsed = designSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid design update' });
      return;
    }
    const d = parsed.data;
    const resUpd = await executeSql(
      `UPDATE designs_catalog
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           category_id = COALESCE(?, category_id),
           gender = COALESCE(?, gender),
           boutique = COALESCE(?, boutique),
           price = COALESCE(?, price),
           original_price = CASE WHEN ? THEN ? ELSE original_price END,
           image_url = COALESCE(?, image_url),
           turnaround_days = COALESCE(?, turnaround_days),
           trusted = COALESCE(?, trusted),
           description = COALESCE(?, description),
           fabric_note = COALESCE(?, fabric_note),
           is_trending = COALESCE(?, is_trending),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        d.title ?? null,
        d.category ?? null,
        d.categoryId ?? null,
        d.gender ?? null,
        d.boutique ?? null,
        d.price ?? null,
        d.originalPrice !== undefined ? 1 : 0,
        d.originalPrice ?? null,
        d.imageUrl ?? null,
        d.turnaroundDays ?? null,
        d.trusted !== undefined ? (d.trusted ? 1 : 0) : null,
        d.description ?? null,
        d.fabricNote ?? null,
        d.isTrending !== undefined ? (d.isTrending ? 1 : 0) : null,
        d.isActive !== undefined ? (d.isActive ? 1 : 0) : null,
        id,
      ],
    );
    if (resUpd.affectedRows === 0) {
      res.status(404).json({ error: 'Design not found.' });
      return;
    }
    res.json({ message: 'Design updated on storefront.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/designs/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid design ID.' });
      return;
    }
    await executeSql(`DELETE FROM designs_catalog WHERE id = ?`, [id]);
    res.json({ message: 'Design removed from storefront.' });
  } catch (err) {
    next(err);
  }
});

// 10. DOORSTEP ALTERATION SERVICES CRUD (Updates AlterationsPage live)
router.get('/alterations', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 15, 50);

    const conditions: string[] = [];
    const params: string[] = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(`(title LIKE ? OR description LIKE ?)`);
      params.push(like, like);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM alteration_services ${whereClause}`,
        params,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT * FROM alteration_services ${whereClause} ORDER BY section ASC, id DESC LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ alterations: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const alterationSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(''),
  price: z.coerce.number().min(10).max(50000),
  unit: z.string().trim().min(1).max(40).default('item'),
  badge: z.string().trim().min(1).max(60).default('POPULAR'),
  badgeColor: z.enum(['amber', 'orange', 'blue', 'emerald', 'rose', 'purple']).default('amber'),
  section: z.enum(['garment', 'saree']).default('garment'),
  iconType: z
    .enum([
      'button',
      'tear',
      'waist',
      'length',
      'zip-small',
      'sleeve',
      'slim-fit',
      'zip-large',
      'jeans',
      'double-stitch',
      'saree-fall',
      'saree-pleat',
    ])
    .default('waist'),
  isActive: z.boolean().default(true),
});

router.post('/alterations', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = alterationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid alteration data' });
      return;
    }
    const d = parsed.data;
    const slug = `alt-${Date.now().toString(36)}`;
    const result = await executeSql(
      `INSERT INTO alteration_services (
         slug, title, description, price, unit, badge, badge_color, section, icon_type, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        d.title,
        d.description,
        d.price,
        d.unit,
        d.badge,
        d.badgeColor,
        d.section,
        d.iconType,
        d.isActive ? 1 : 0,
      ],
    );
    res.status(201).json({ id: result.insertId, message: 'Alteration service added.' });
  } catch (err) {
    next(err);
  }
});

router.patch('/alterations/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid alteration ID.' });
      return;
    }
    const parsed = alterationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update' });
      return;
    }
    const d = parsed.data;
    const resUpd = await executeSql(
      `UPDATE alteration_services
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           unit = COALESCE(?, unit),
           badge = COALESCE(?, badge),
           badge_color = COALESCE(?, badge_color),
           section = COALESCE(?, section),
           icon_type = COALESCE(?, icon_type),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        d.title ?? null,
        d.description ?? null,
        d.price ?? null,
        d.unit ?? null,
        d.badge ?? null,
        d.badgeColor ?? null,
        d.section ?? null,
        d.iconType ?? null,
        d.isActive !== undefined ? (d.isActive ? 1 : 0) : null,
        id,
      ],
    );
    if (resUpd.affectedRows === 0) {
      res.status(404).json({ error: 'Alteration service not found.' });
      return;
    }
    res.json({ message: 'Alteration service updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/alterations/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid alteration ID.' });
      return;
    }
    await executeSql(`DELETE FROM alteration_services WHERE id = ?`, [id]);
    res.json({ message: 'Alteration service removed.' });
  } catch (err) {
    next(err);
  }
});

export default router;
