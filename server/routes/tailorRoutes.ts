import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthedRequest, requireAuth, requireRole } from '../auth';
import { executeSql, getPlatformSettingsMap, queryRows, withTransaction } from '../db';
import {
  ALLOWED_PORTFOLIO_MIMES,
  buildPaginationMeta,
  createRateLimiter,
  parsePagination,
  signPortfolioPreviewToken,
  validatePortfolioImageBuffer,
} from '../security';

const router = Router();
router.use(requireAuth, requireRole('tailor'));

const TAILOR_ALLOWED_STATUSES = [
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
] as const;

async function getTailorProfileOrFail(userId: number): Promise<RowDataPacket> {
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT * FROM tailor_profiles WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) {
    const err = new Error('Tailor profile not found for this account.') as Error & {
      statusCode?: number;
    };
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

// 1. TAILOR OVERVIEW KPIs
router.get('/overview', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const tailorId = Number(profile.id);

    const [orderStatsRows, paymentStatsRows, openPoolRows, recentOrders] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS total_orders,
           SUM(CASE WHEN status NOT IN ('Delivered', 'Cancelled') THEN 1 ELSE 0 END) AS active_orders,
           SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
           SUM(CASE WHEN status IN ('Booking Created', 'Tailor Accepted', 'Visit Scheduled', 'Measurements Completed') THEN 1 ELSE 0 END) AS awaiting_quote,
           SUM(CASE WHEN status = 'Quotation Submitted' AND quote_approved = 0 THEN 1 ELSE 0 END) AS pending_approval
         FROM orders
         WHERE tailor_id = ?`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN tailor_earning ELSE 0 END), 0) AS total_earned,
           COALESCE(SUM(CASE WHEN payment_status = 'completed' AND payout_status = 'settled' THEN tailor_earning ELSE 0 END), 0) AS settled_earnings,
           COALESCE(SUM(CASE WHEN payment_status = 'completed' AND payout_status <> 'settled' THEN tailor_earning ELSE 0 END), 0) AS pending_payout,
           COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN tailor_earning ELSE 0 END), 0) AS upcoming_earnings
         FROM payments
         WHERE tailor_id = ?`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS open_orders FROM orders WHERE tailor_id IS NULL AND status = 'Booking Created'`,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT o.id, o.order_code, o.service_title, o.status, o.total_amount, o.tailor_payout,
                o.quote_approved, o.payment_status, o.pickup_date, o.delivery_date, o.locality,
                c.full_name AS customer_name
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         WHERE o.tailor_id = ?
         ORDER BY o.updated_at DESC
         LIMIT 6`,
        [tailorId],
      ),
    ]);

    const oStats = orderStatsRows[0] || {};
    const pStats = paymentStatsRows[0] || {};

    res.json({
      profile: {
        id: tailorId,
        shopName: String(profile.shop_name),
        masterTailor: String(profile.master_tailor),
        locality: String(profile.locality),
        isAvailable: Boolean(profile.is_available),
        isVerified: Boolean(profile.is_verified),
        rating: Number(profile.rating),
        commissionRate: Number(profile.commission_rate),
        logoUrl: profile.logo_url ? String(profile.logo_url) : '',
      },
      kpis: {
        totalOrders: Number(oStats.total_orders || 0),
        activeOrders: Number(oStats.active_orders || 0),
        deliveredOrders: Number(oStats.delivered_orders || 0),
        awaitingQuote: Number(oStats.awaiting_quote || 0),
        pendingApproval: Number(oStats.pending_approval || 0),
        openPoolOrders: Number(openPoolRows[0]?.open_orders || 0),
        totalEarned: Number(pStats.total_earned || 0),
        settledEarnings: Number(pStats.settled_earnings || 0),
        pendingPayout: Number(pStats.pending_payout || 0),
        upcomingEarnings: Number(pStats.upcoming_earnings || 0),
      },
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

// 2. TAILOR PROFILE & AVAILABILITY MANAGEMENT
router.get('/profile', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    let specialties: string[] = [];
    try {
      specialties =
        typeof profile.specialties_json === 'string'
          ? JSON.parse(profile.specialties_json)
          : Array.isArray(profile.specialties_json)
            ? profile.specialties_json
            : [];
    } catch {
      specialties = [];
    }

    res.json({
      profile: {
        id: Number(profile.id),
        shopName: String(profile.shop_name),
        masterTailor: String(profile.master_tailor),
        bio: profile.bio ? String(profile.bio) : '',
        locality: String(profile.locality),
        address: profile.address ? String(profile.address) : '',
        specialties,
        workingHours: String(profile.working_hours),
        experienceYears: Number(profile.experience_years),
        homeVisitFee: Number(profile.home_visit_fee),
        pickupAvailable: Boolean(profile.pickup_available),
        isAvailable: Boolean(profile.is_available),
        isVerified: Boolean(profile.is_verified),
        commissionRate: Number(profile.commission_rate),
        rating: Number(profile.rating),
        completedOrders: Number(profile.completed_orders),
        coverImageUrl: profile.cover_image_url ? String(profile.cover_image_url) : '',
        logoUrl: profile.logo_url ? String(profile.logo_url) : '',
        turnaroundText: profile.turnaround_text ? String(profile.turnaround_text) : '3–5 Days',
        turnaroundDays: Number(profile.turnaround_days || 4),
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateTailorProfileSchema = z.object({
  shopName: z.string().trim().min(2).max(160).optional(),
  masterTailor: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  locality: z.string().trim().min(2).max(160).optional(),
  address: z.string().trim().max(400).optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  workingHours: z.string().trim().min(3).max(120).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  homeVisitFee: z.coerce.number().min(0).max(1000).optional(),
  pickupAvailable: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  coverImageUrl: z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => v === '' || v.startsWith('/') || v.startsWith('https://') || v.startsWith('http://'),
      'Cover image must be a valid relative or http(s) URL.',
    )
    .optional(),
  turnaroundText: z.string().trim().min(2).max(60).optional(),
  turnaroundDays: z.coerce.number().int().min(1).max(60).optional(),
});

router.put('/profile', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const parsed = updateTailorProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile fields' });
      return;
    }

    const d = parsed.data;
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE tailor_profiles
         SET shop_name = COALESCE(?, shop_name),
             master_tailor = COALESCE(?, master_tailor),
             bio = COALESCE(?, bio),
             locality = COALESCE(?, locality),
             address = COALESCE(?, address),
             specialties_json = COALESCE(?, specialties_json),
             working_hours = COALESCE(?, working_hours),
             experience_years = COALESCE(?, experience_years),
             home_visit_fee = COALESCE(?, home_visit_fee),
             pickup_available = COALESCE(?, pickup_available),
             is_available = COALESCE(?, is_available),
             cover_image_url = CASE WHEN ? THEN ? ELSE cover_image_url END,
             turnaround_text = COALESCE(?, turnaround_text),
             turnaround_days = COALESCE(?, turnaround_days)
         WHERE id = ?`,
        [
          d.shopName ?? null,
          d.masterTailor ?? null,
          d.bio ?? null,
          d.locality ?? null,
          d.address ?? null,
          d.specialties ? JSON.stringify(d.specialties) : null,
          d.workingHours ?? null,
          d.experienceYears ?? null,
          d.homeVisitFee ?? null,
          d.pickupAvailable !== undefined ? (d.pickupAvailable ? 1 : 0) : null,
          d.isAvailable !== undefined ? (d.isAvailable ? 1 : 0) : null,
          d.coverImageUrl !== undefined ? 1 : 0,
          d.coverImageUrl || null,
          d.turnaroundText ?? null,
          d.turnaroundDays ?? null,
          profile.id,
        ],
      );

      if (d.locality) {
        await conn.execute(`UPDATE users SET locality = ? WHERE id = ?`, [d.locality, req.user!.id]);
      }
    });

    res.json({ message: 'Shop profile & availability updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 2B. TAILOR SHOP LOGO UPLOAD & REMOVAL (Validated JPEG/PNG/WebP stored in MySQL)
const shopLogoUploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'tailor-logo-upload',
  message: 'Too many logo upload attempts. Please wait a few minutes and try again.',
});

const shopLogoUploadSchema = z.object({
  mimeType: z.enum(ALLOWED_PORTFOLIO_MIMES),
  imageBase64: z.string().min(32).max(2_200_000),
});

router.post(
  '/logo',
  shopLogoUploadLimiter,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await getTailorProfileOrFail(req.user!.id);
      const tailorId = Number(profile.id);
      const parsed = shopLogoUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid logo image.' });
        return;
      }

      const cleanedBase64 = parsed.data.imageBase64.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        '',
      );
      const imageBuffer = Buffer.from(cleanedBase64, 'base64');
      const check = validatePortfolioImageBuffer(imageBuffer, parsed.data.mimeType);
      if (!check.valid) {
        res.status(400).json({ error: check.reason || 'Unsupported logo format.' });
        return;
      }

      const logoUrl = `/api/public/tailors/${tailorId}/logo?v=${Date.now()}`;
      await executeSql(
        `UPDATE tailor_profiles
         SET logo_url = ?, logo_mime = ?, logo_data = ?
         WHERE id = ?`,
        [logoUrl, parsed.data.mimeType, imageBuffer, tailorId],
      );

      res.status(200).json({ logoUrl, message: 'Shop logo uploaded and live on storefront.' });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/logo', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    await executeSql(
      `UPDATE tailor_profiles
       SET logo_url = NULL, logo_mime = NULL, logo_data = NULL
       WHERE id = ?`,
      [profile.id],
    );
    res.json({ message: 'Shop logo removed.' });
  } catch (err) {
    next(err);
  }
});

// 3. TAILOR SERVICES & PRICING CRUD (Paginated)
router.get('/services', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const [countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM services WHERE tailor_id = ?`,
        [profile.id],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, title, category, description, base_price, turnaround_days, is_active, created_at
         FROM services
         WHERE tailor_id = ?
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [profile.id],
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({ services: rows, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

const tailorServiceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  category: z.enum(['custom', 'alteration', 'uniform', 'bridal', 'menswear']),
  description: z.string().trim().max(600).optional(),
  basePrice: z.coerce.number().min(20).max(500000),
  turnaroundDays: z.coerce.number().int().min(1).max(60).default(3),
  isActive: z.boolean().default(true),
});

router.post('/services', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const parsed = tailorServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service details' });
      return;
    }
    const d = parsed.data;
    const resInsert = await executeSql(
      `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        d.title,
        d.category,
        d.description || null,
        d.basePrice,
        d.turnaroundDays,
        d.isActive ? 1 : 0,
      ],
    );
    res.status(201).json({ id: resInsert.insertId, message: 'Service added to your price list.' });
  } catch (err) {
    next(err);
  }
});

router.patch('/services/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      res.status(400).json({ error: 'Invalid service ID.' });
      return;
    }

    const parsed = tailorServiceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service update' });
      return;
    }

    const d = parsed.data;
    const result = await executeSql(
      `UPDATE services
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           description = COALESCE(?, description),
           base_price = COALESCE(?, base_price),
           turnaround_days = COALESCE(?, turnaround_days),
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND tailor_id = ?`,
      [
        d.title ?? null,
        d.category ?? null,
        d.description ?? null,
        d.basePrice ?? null,
        d.turnaroundDays ?? null,
        d.isActive !== undefined ? (d.isActive ? 1 : 0) : null,
        serviceId,
        profile.id,
      ],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Service not found in your catalog.' });
      return;
    }
    res.json({ message: 'Service pricing updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/services/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      res.status(400).json({ error: 'Invalid service ID.' });
      return;
    }
    const result = await executeSql(
      `DELETE FROM services WHERE id = ? AND tailor_id = ?`,
      [serviceId, profile.id],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Service not found in your catalog.' });
      return;
    }
    res.json({ message: 'Service deleted.' });
  } catch (err) {
    next(err);
  }
});

// 4. ASSIGNED ORDERS + OPEN POOL QUEUE (Paginated + Status filter)
router.get('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const tailorId = Number(profile.id);
    const settings = await getPlatformSettingsMap();
    const maskAddress = settings.mask_address_until_accepted !== 'false';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 8, 50);

    const assignedConds: string[] = [`o.tailor_id = ?`];
    const assignedParams: (string | number)[] = [tailorId];
    if (status) {
      assignedConds.push(`o.status = ?`);
      assignedParams.push(status);
    }

    const [assignedCountRows, assignedOrders, openOrders] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM orders o WHERE ${assignedConds.join(' AND ')}`,
        assignedParams,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         WHERE ${assignedConds.join(' AND ')}
         ORDER BY o.updated_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        assignedParams,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT o.*, c.full_name AS customer_name
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         WHERE o.tailor_id IS NULL AND o.status = 'Booking Created'
         ORDER BY o.created_at DESC
         LIMIT 20`,
      ),
    ]);

    const sanitizeOrder = (o: RowDataPacket, isUnaccepted: boolean) => ({
      ...o,
      pickup_address:
        maskAddress && isUnaccepted
          ? `${o.locality} (Exact address unlocks once accepted)`
          : o.pickup_address,
    });

    const total = Number(assignedCountRows[0]?.total || 0);
    res.json({
      assignedOrders: assignedOrders.map((o) =>
        sanitizeOrder(o, String(o.status) === 'Booking Created'),
      ),
      openOrders: openOrders.map((o) => sanitizeOrder(o, true)),
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

// Accept an open pool order (atomic lock inside transaction)
router.post('/orders/:id/accept', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
        [orderId],
      );
      if (rows.length === 0) {
        const err = new Error('Order not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const ord = rows[0];
      if (ord.tailor_id !== null && Number(ord.tailor_id) !== Number(profile.id)) {
        const err = new Error('This order was already accepted by another tailor.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 409;
        throw err;
      }

      const commRate = Number(profile.commission_rate || 12);
      const total = Number(ord.total_amount);
      const comm = Number(((total * commRate) / 100).toFixed(2));
      const payout = Number((total - comm).toFixed(2));

      await conn.execute(
        `UPDATE orders
         SET tailor_id = ?, status = 'Tailor Accepted', platform_commission = ?, tailor_payout = ?
         WHERE id = ?`,
        [profile.id, comm, payout, orderId],
      );

      await conn.execute(
        `UPDATE payments SET tailor_id = ?, platform_fee = ?, tailor_earning = ? WHERE order_id = ?`,
        [profile.id, comm, payout, orderId],
      );

      await conn.execute(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES (?, ?, 'Tailor Accepted', ?, ?)`,
        [orderId, ord.status, req.user!.id, `Accepted by ${profile.shop_name}`],
      );

      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, category, related_order_id)
         VALUES (?, ?, ?, 'order', ?)`,
        [
          ord.customer_id,
          `Tailor Assigned for ${ord.order_code}`,
          `${profile.shop_name} has accepted your order and will proceed with pickup/measurements.`,
          orderId,
        ],
      );
    });

    res.json({ message: 'Order accepted and assigned to your atelier.' });
  } catch (err) {
    next(err);
  }
});

// Update assigned order status, quotation, delivery date, or notes
const updateTailorOrderSchema = z.object({
  status: z.enum(TAILOR_ALLOWED_STATUSES).optional(),
  quotedAmount: z.coerce.number().min(20).max(500000).optional(),
  deliveryDate: z.string().trim().max(20).nullable().optional(),
  note: z.string().trim().max(240).optional(),
});

router.patch('/orders/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    const parsed = updateTailorOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid order update' });
      return;
    }

    const d = parsed.data;
    const settings = await getPlatformSettingsMap();
    const requireQuoteApproval = settings.require_quote_approval !== 'false';

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE id = ? AND tailor_id = ? FOR UPDATE`,
        [orderId, profile.id],
      );
      if (rows.length === 0) {
        const err = new Error('Order not found or not assigned to your shop.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 404;
        throw err;
      }

      const ord = rows[0];
      if (String(ord.status) === 'Cancelled') {
        const err = new Error('Cancelled orders cannot be modified.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 400;
        throw err;
      }

      const nextStatus = d.status ?? String(ord.status);

      // Enforce Tailering hard business rule: stitching requires customer quote approval
      const postApprovalStages = ['Stitching Started', 'Quality Check', 'Ready for Delivery', 'Delivered'];
      if (
        requireQuoteApproval &&
        postApprovalStages.includes(nextStatus) &&
        !Boolean(ord.quote_approved)
      ) {
        const err = new Error(
          'Tailering Rule: Stitching cannot start until the customer approves the submitted quotation.',
        ) as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }

      const nextQuoted = d.quotedAmount !== undefined ? d.quotedAmount : Number(ord.quoted_amount);
      const nextTotal = nextQuoted + Number(ord.visit_fee);
      const commRate = Number(profile.commission_rate || 12);
      const commission = Number(((nextTotal * commRate) / 100).toFixed(2));
      const payout = Number((nextTotal - commission).toFixed(2));

      // If tailor submits a revised quote, reset quote_approved if status is Quotation Submitted
      const nextQuoteApproved =
        d.status === 'Quotation Submitted' ||
        (d.quotedAmount !== undefined && Number(d.quotedAmount) !== Number(ord.quoted_amount))
          ? 0
          : Number(ord.quote_approved);

      await conn.execute(
        `UPDATE orders
         SET status = ?,
             quoted_amount = ?,
             total_amount = ?,
             platform_commission = ?,
             tailor_payout = ?,
             quote_approved = ?,
             delivery_date = CASE WHEN ? THEN ? ELSE delivery_date END
         WHERE id = ?`,
        [
          nextStatus,
          nextQuoted,
          nextTotal,
          commission,
          payout,
          nextQuoteApproved,
          d.deliveryDate !== undefined ? 1 : 0,
          d.deliveryDate || null,
          orderId,
        ],
      );

      await conn.execute(
        `UPDATE payments
         SET amount = ?, platform_fee = ?, tailor_earning = ?
         WHERE order_id = ? AND payment_status = 'pending'`,
        [nextTotal, commission, payout, orderId],
      );

      if (nextStatus !== ord.status || d.quotedAmount !== undefined || d.deliveryDate !== undefined) {
        await conn.execute(
          `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
           VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            ord.status,
            nextStatus,
            req.user!.id,
            d.note ||
              (nextStatus === 'Quotation Submitted'
                ? `Final quote of ₹${nextTotal.toLocaleString('en-IN')} submitted`
                : `Updated to ${nextStatus} by ${profile.shop_name}`),
          ],
        );

        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'order', ?)`,
          [
            ord.customer_id,
            `Order ${ord.order_code}: ${nextStatus}`,
            nextStatus === 'Quotation Submitted'
              ? `${profile.shop_name} submitted a quote of ₹${nextTotal.toLocaleString('en-IN')}. Please review & approve to begin stitching.`
              : `${profile.shop_name} updated your order status to "${nextStatus}".`,
            orderId,
          ],
        );

        if (nextStatus === 'Delivered' && String(ord.status) !== 'Delivered') {
          await conn.execute(
            `UPDATE tailor_profiles SET completed_orders = completed_orders + 1 WHERE id = ?`,
            [profile.id],
          );
        }
      }
    });

    res.json({ message: 'Order updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 5. EARNINGS & PAYOUT HISTORY (Paginated)
router.get('/earnings', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const { page, limit, offset } = parsePagination(req.query, 10, 50);

    const [summaryRows, countRows, ledger] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT
           COALESCE(SUM(amount), 0) AS gross_billed,
           COALESCE(SUM(platform_fee), 0) AS total_platform_fee,
           COALESCE(SUM(tailor_earning), 0) AS net_tailor_earning,
           COALESCE(SUM(CASE WHEN payout_status = 'settled' THEN tailor_earning ELSE 0 END), 0) AS settled_amount,
           COALESCE(SUM(CASE WHEN payment_status = 'completed' AND payout_status <> 'settled' THEN tailor_earning ELSE 0 END), 0) AS ready_for_payout
         FROM payments
         WHERE tailor_id = ?`,
        [profile.id],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM payments WHERE tailor_id = ?`,
        [profile.id],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT p.*, o.order_code, o.service_title, o.status AS order_status, c.full_name AS customer_name
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         JOIN users c ON c.id = p.customer_id
         WHERE p.tailor_id = ?
         ORDER BY p.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [profile.id],
      ),
    ]);

    const total = Number(countRows[0]?.total || 0);
    res.json({
      commissionRate: Number(profile.commission_rate),
      summary: summaryRows[0] || {},
      ledger,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

// 6. TAILOR PORTFOLIO SHOWCASE CRUD (Paginated + Validated Image Uploads)
const portfolioUploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'portfolio-upload',
  message: 'Upload limit reached temporarily. Please wait a few minutes before adding more photos.',
});

const createPortfolioSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140),
  category: z.enum(['custom', 'alteration', 'uniform', 'bridal', 'menswear']).default('custom'),
  caption: z.string().trim().max(500).optional(),
  priceHint: z.coerce.number().min(20).max(500000).nullable().optional(),
  turnaroundDays: z.coerce.number().int().min(1).max(60).nullable().optional(),
  isFeatured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  mimeType: z.enum(ALLOWED_PORTFOLIO_MIMES),
  imageBase64: z.string().min(32).max(2_200_000),
});

const updatePortfolioSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  category: z.enum(['custom', 'alteration', 'uniform', 'bridal', 'menswear']).optional(),
  caption: z.string().trim().max(500).nullable().optional(),
  priceHint: z.coerce.number().min(20).max(500000).nullable().optional(),
  turnaroundDays: z.coerce.number().int().min(1).max(60).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

router.get('/portfolio', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const tailorId = Number(profile.id);
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const { page, limit, offset } = parsePagination(req.query, 9, 30);

    const conditions: string[] = [`tailor_id = ?`];
    const params: (string | number)[] = [tailorId];
    if (category && ['custom', 'alteration', 'uniform', 'bridal', 'menswear'].includes(category)) {
      conditions.push(`category = ?`);
      params.push(category);
    }

    const whereClause = conditions.join(' AND ');
    const [statsRows, countRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS total_count,
           SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) AS visible_count,
           SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) AS featured_count
         FROM tailor_portfolio_items
         WHERE tailor_id = ?`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM tailor_portfolio_items WHERE ${whereClause}`,
        params,
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, tailor_id, title, category, caption, price_hint, turnaround_days,
                mime_type, is_featured, is_visible, created_at, updated_at
         FROM tailor_portfolio_items
         WHERE ${whereClause}
         ORDER BY is_featured DESC, created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const items = rows.map((r) => {
      const id = Number(r.id);
      const token = signPortfolioPreviewToken(id, tailorId);
      const version = r.updated_at ? new Date(String(r.updated_at)).getTime() : id;
      return {
        id,
        title: String(r.title),
        category: String(r.category),
        caption: r.caption ? String(r.caption) : '',
        priceHint: r.price_hint !== null ? Number(r.price_hint) : null,
        turnaroundDays: r.turnaround_days !== null ? Number(r.turnaround_days) : null,
        mimeType: String(r.mime_type),
        isFeatured: Boolean(r.is_featured),
        isVisible: Boolean(r.is_visible),
        imageUrl: `/api/public/portfolio/${id}/image?t=${token}&v=${version}`,
        createdAt: r.created_at,
      };
    });

    const stats = statsRows[0] || {};
    const total = Number(countRows[0]?.total || 0);
    res.json({
      items,
      stats: {
        totalCount: Number(stats.total_count || 0),
        visibleCount: Number(stats.visible_count || 0),
        featuredCount: Number(stats.featured_count || 0),
      },
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/portfolio',
  portfolioUploadLimiter,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await getTailorProfileOrFail(req.user!.id);
      const tailorId = Number(profile.id);

      const parsed = createPortfolioSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid portfolio item payload.' });
        return;
      }

      const [existingCountRows] = await Promise.all([
        queryRows<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM tailor_portfolio_items WHERE tailor_id = ?`,
          [tailorId],
        ),
      ]);
      if (Number(existingCountRows[0]?.cnt || 0) >= 40) {
        res.status(400).json({
          error: 'Portfolio limit of 40 photos reached. Delete an older piece to upload a new one.',
        });
        return;
      }

      const d = parsed.data;
      const cleanedBase64 = d.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      const imageBuffer = Buffer.from(cleanedBase64, 'base64');
      const check = validatePortfolioImageBuffer(imageBuffer, d.mimeType);
      if (!check.valid) {
        res.status(400).json({ error: check.reason || 'Invalid image upload.' });
        return;
      }

      const insertRes = await executeSql(
        `INSERT INTO tailor_portfolio_items (
           tailor_id, title, category, caption, price_hint, turnaround_days,
           mime_type, image_data, is_featured, is_visible
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tailorId,
          d.title,
          d.category,
          d.caption || null,
          d.priceHint ?? null,
          d.turnaroundDays ?? null,
          d.mimeType,
          imageBuffer,
          d.isFeatured ? 1 : 0,
          d.isVisible ? 1 : 0,
        ],
      );

      const id = insertRes.insertId;
      const token = signPortfolioPreviewToken(id, tailorId);
      res.status(201).json({
        id,
        imageUrl: `/api/public/portfolio/${id}/image?t=${token}&v=${Date.now()}`,
        message: `"${d.title}" added to your Tailor Portfolio!`,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/portfolio/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: 'Invalid portfolio item ID.' });
      return;
    }

    const parsed = updatePortfolioSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update payload.' });
      return;
    }

    const d = parsed.data;
    const result = await executeSql(
      `UPDATE tailor_portfolio_items
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           caption = CASE WHEN ? THEN ? ELSE caption END,
           price_hint = CASE WHEN ? THEN ? ELSE price_hint END,
           turnaround_days = CASE WHEN ? THEN ? ELSE turnaround_days END,
           is_featured = COALESCE(?, is_featured),
           is_visible = COALESCE(?, is_visible)
       WHERE id = ? AND tailor_id = ?`,
      [
        d.title ?? null,
        d.category ?? null,
        d.caption !== undefined ? 1 : 0,
        d.caption ?? null,
        d.priceHint !== undefined ? 1 : 0,
        d.priceHint ?? null,
        d.turnaroundDays !== undefined ? 1 : 0,
        d.turnaroundDays ?? null,
        d.isFeatured !== undefined ? (d.isFeatured ? 1 : 0) : null,
        d.isVisible !== undefined ? (d.isVisible ? 1 : 0) : null,
        itemId,
        profile.id,
      ],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Portfolio photo not found.' });
      return;
    }
    res.json({ message: 'Portfolio item updated.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/portfolio/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: 'Invalid portfolio item ID.' });
      return;
    }

    const result = await executeSql(
      `DELETE FROM tailor_portfolio_items WHERE id = ? AND tailor_id = ?`,
      [itemId, profile.id],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Portfolio photo not found.' });
      return;
    }
    res.json({ message: 'Portfolio photo removed.' });
  } catch (err) {
    next(err);
  }
});

export default router;
