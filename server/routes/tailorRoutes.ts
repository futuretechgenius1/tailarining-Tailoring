import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthedRequest, requireAuth, requireRole } from '../auth';
import { executeSql, getPlatformSettingsMap, queryRows, withTransaction } from '../db';

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
             is_available = COALESCE(?, is_available)
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

// 3. TAILOR SERVICES & PRICING CRUD
router.get('/services', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, title, category, description, base_price, turnaround_days, is_active, created_at
       FROM services
       WHERE tailor_id = ?
       ORDER BY created_at DESC`,
      [profile.id],
    );
    res.json({ services: rows });
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

// 4. ASSIGNED ORDERS + OPEN POOL QUEUE
router.get('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const tailorId = Number(profile.id);
    const settings = await getPlatformSettingsMap();
    const maskAddress = settings.mask_address_until_accepted !== 'false';

    const [assignedOrders, openOrders] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         WHERE o.tailor_id = ?
         ORDER BY o.updated_at DESC`,
        [tailorId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT o.*, c.full_name AS customer_name
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         WHERE o.tailor_id IS NULL AND o.status = 'Booking Created'
         ORDER BY o.created_at DESC`,
      ),
    ]);

    const sanitizeOrder = (o: RowDataPacket, isUnaccepted: boolean) => ({
      ...o,
      pickup_address:
        maskAddress && isUnaccepted
          ? `${o.locality} (Exact address unlocks once accepted)`
          : o.pickup_address,
    });

    res.json({
      assignedOrders: assignedOrders.map((o) =>
        sanitizeOrder(o, String(o.status) === 'Booking Created'),
      ),
      openOrders: openOrders.map((o) => sanitizeOrder(o, true)),
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

// 5. EARNINGS & PAYOUT HISTORY
router.get('/earnings', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getTailorProfileOrFail(req.user!.id);
    const [summaryRows, ledger] = await Promise.all([
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
        `SELECT p.*, o.order_code, o.service_title, o.status AS order_status, c.full_name AS customer_name
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         JOIN users c ON c.id = p.customer_id
         WHERE p.tailor_id = ?
         ORDER BY p.created_at DESC`,
        [profile.id],
      ),
    ]);

    res.json({
      commissionRate: Number(profile.commission_rate),
      summary: summaryRows[0] || {},
      ledger,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
