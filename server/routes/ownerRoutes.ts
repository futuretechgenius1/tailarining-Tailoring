import { Router, Response, NextFunction } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthedRequest, hashPassword, requireAuth, requireRole } from '../auth';
import { executeSql, queryRows, withTransaction } from '../db';

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

// 2. USERS & CUSTOMERS MANAGEMENT
router.get('/users', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.locality, u.address, u.created_at,
              COUNT(DISTINCT o.id) AS order_count,
              COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
              tp.shop_name
       FROM users u
       LEFT JOIN orders o ON o.customer_id = u.id
       LEFT JOIN tailor_profiles tp ON tp.user_id = u.id
       WHERE (? = '' OR u.role = ?)
         AND (? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.locality LIKE ?)
       GROUP BY u.id, tp.shop_name
       ORDER BY u.created_at DESC`,
      [role, role, q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
    );

    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8).max(128),
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

// 3. TAILORS MANAGEMENT
router.get('/tailors', async (_req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(`
      SELECT tp.*, u.full_name, u.email, u.phone, u.status AS user_status,
             COUNT(DISTINCT o.id) AS total_orders,
             SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_count,
             COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_gmv,
             COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.tailor_payout ELSE 0 END), 0) AS total_payout
      FROM tailor_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN orders o ON o.tailor_id = tp.id
      GROUP BY tp.id
      ORDER BY tp.created_at DESC
    `);

    res.json({ tailors: rows });
  } catch (err) {
    next(err);
  }
});

const patchTailorSchema = z.object({
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
         SET is_verified = COALESCE(?, is_verified),
             is_available = COALESCE(?, is_available),
             commission_rate = COALESCE(?, commission_rate),
             home_visit_fee = COALESCE(?, home_visit_fee)
         WHERE id = ?`,
        [
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

// 4. SERVICES CATALOG MANAGEMENT (CRUD)
router.get('/services', async (_req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(`
      SELECT s.*, tp.shop_name AS tailor_shop_name
      FROM services s
      LEFT JOIN tailor_profiles tp ON tp.id = s.tailor_id
      ORDER BY s.tailor_id IS NOT NULL, s.created_at DESC
    `);
    res.json({ services: rows });
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

// 5. ORDERS MANAGEMENT (View all, assign tailor, update status/quote/delivery in transaction)
router.get('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT o.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
              tp.shop_name AS tailor_shop_name, tp.master_tailor
       FROM orders o
       JOIN users c ON c.id = o.customer_id
       LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
       WHERE (? = '' OR o.status = ?)
         AND (? = '' OR o.order_code LIKE ? OR o.service_title LIKE ? OR c.full_name LIKE ? OR tp.shop_name LIKE ?)
       ORDER BY o.created_at DESC`,
      [status, status, q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
    );

    res.json({ orders: rows });
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

// 6. PAYMENTS & SETTLEMENTS LEDGER
router.get('/payments', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT p.*, o.order_code, o.service_title, c.full_name AS customer_name, tp.shop_name AS tailor_shop_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN users c ON c.id = p.customer_id
       LEFT JOIN tailor_profiles tp ON tp.id = p.tailor_id
       WHERE (? = '' OR p.payment_status = ?)
       ORDER BY p.created_at DESC`,
      [status, status],
    );
    res.json({ payments: rows });
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
             paid_at = CASE WHEN ? = 'completed' AND paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE paid_at END,
             settled_at = CASE WHEN ? = 'settled' AND settled_at IS NULL THEN CURRENT_TIMESTAMP ELSE settled_at END
         WHERE id = ?`,
        [
          nextPayStatus,
          nextPayoutStatus,
          d.transactionRef ?? null,
          nextPayStatus,
          nextPayoutStatus,
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

export default router;
