import { Router, Response, NextFunction } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { AuthedRequest, requireAuth, requireRole } from '../auth';
import { executeSql, getPlatformSettingsMap, queryRows, withTransaction } from '../db';

const router = Router();
router.use(requireAuth, requireRole('customer'));

function generateOrderCode(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TLR-${new Date().getFullYear()}-${rand}`;
}

function generatePaymentCode(): string {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `PAY-${new Date().getFullYear()}-${rand}`;
}

// 1. CUSTOMER DASHBOARD OVERVIEW
router.get('/overview', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.user!.id;
    const [orderStatsRows, paymentStatsRows, measRows, notifRows, recentOrders] =
      await Promise.all([
        queryRows<RowDataPacket[]>(
          `SELECT
             COUNT(*) AS total_orders,
             SUM(CASE WHEN status NOT IN ('Delivered', 'Cancelled') THEN 1 ELSE 0 END) AS active_orders,
             SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
             SUM(CASE WHEN status = 'Quotation Submitted' AND quote_approved = 0 THEN 1 ELSE 0 END) AS quotes_awaiting_approval
           FROM orders
           WHERE customer_id = ?`,
          [uid],
        ),
        queryRows<RowDataPacket[]>(
          `SELECT
             COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) AS total_paid,
             COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_due
           FROM payments
           WHERE customer_id = ?`,
          [uid],
        ),
        queryRows<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM measurement_profiles WHERE customer_id = ?`,
          [uid],
        ),
        queryRows<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0`,
          [uid],
        ),
        queryRows<RowDataPacket[]>(
          `SELECT o.*, tp.shop_name AS tailor_shop_name, tp.master_tailor
           FROM orders o
           LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
           WHERE o.customer_id = ?
           ORDER BY o.created_at DESC
           LIMIT 5`,
          [uid],
        ),
      ]);

    const oStats = orderStatsRows[0] || {};
    const pStats = paymentStatsRows[0] || {};

    res.json({
      kpis: {
        totalOrders: Number(oStats.total_orders || 0),
        activeOrders: Number(oStats.active_orders || 0),
        deliveredOrders: Number(oStats.delivered_orders || 0),
        quotesAwaitingApproval: Number(oStats.quotes_awaiting_approval || 0),
        totalPaid: Number(pStats.total_paid || 0),
        pendingDue: Number(pStats.pending_due || 0),
        savedMeasurements: Number(measRows[0]?.cnt || 0),
        unreadNotifications: Number(notifRows[0]?.cnt || 0),
      },
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

// 2. LIST CUSTOMER ORDERS
router.get('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT o.*, tp.shop_name AS tailor_shop_name, tp.master_tailor, tp.locality AS tailor_locality,
              u.phone AS tailor_phone
       FROM orders o
       LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
       LEFT JOIN users u ON u.id = tp.user_id
       WHERE o.customer_id = ?
         AND (? = '' OR o.status = ?)
       ORDER BY o.created_at DESC`,
      [req.user!.id, status, status],
    );
    res.json({ orders: rows });
  } catch (err) {
    next(err);
  }
});

// 3. SINGLE ORDER DETAIL + LIVE STATUS TIMELINE
router.get('/orders/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    const orderRows = await queryRows<RowDataPacket[]>(
      `SELECT o.*, tp.shop_name AS tailor_shop_name, tp.master_tailor, tp.working_hours
       FROM orders o
       LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
       WHERE o.id = ? AND o.customer_id = ?
       LIMIT 1`,
      [orderId, req.user!.id],
    );
    if (orderRows.length === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const [history, payments] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT h.id, h.from_status, h.to_status, h.note, h.created_at, u.full_name AS actor_name, u.role AS actor_role
         FROM order_status_history h
         JOIN users u ON u.id = h.changed_by_user_id
         WHERE h.order_id = ?
         ORDER BY h.created_at ASC`,
        [orderId],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT * FROM payments WHERE order_id = ? AND customer_id = ? ORDER BY created_at DESC`,
        [orderId, req.user!.id],
      ),
    ]);

    res.json({ order: orderRows[0], history, payments });
  } catch (err) {
    next(err);
  }
});

// 4. PLACE NEW ORDER (Transactional: orders + order_status_history + payments + notifications)
const createOrderSchema = z.object({
  tailorId: z.coerce.number().int().positive().nullable().optional(),
  serviceId: z.coerce.number().int().positive().nullable().optional(),
  serviceTitle: z.string().trim().min(2).max(180).optional(),
  orderType: z.enum(['custom', 'alteration', 'uniform', 'bridal', 'menswear']).default('custom'),
  quotedAmount: z.coerce.number().min(20).max(500000).optional(),
  pickupMode: z.enum(['doorstep_pickup', 'shop_visit']).default('doorstep_pickup'),
  pickupDate: z.string().trim().min(8).max(20),
  pickupSlot: z.string().trim().min(3).max(64),
  locality: z.string().trim().min(2).max(160).optional(),
  pickupAddress: z.string().trim().max(500).optional(),
  garmentNotes: z.string().trim().max(800).optional(),
  customerRequirements: z.string().trim().max(800).optional(),
  paymentMethod: z.enum(['upi', 'card', 'cash', 'netbanking', 'wallet']).default('upi'),
});

router.post('/orders', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid order details' });
      return;
    }

    const d = parsed.data;
    const settings = await getPlatformSettingsMap();
    const defaultCommPct = Number(settings.platform_commission_pct || 12);
    const defaultVisitFee = Number(settings.default_home_visit_fee || 49);
    const freeVisitMin = Number(settings.free_visit_min_order || 500);

    const created = await withTransaction(async (conn) => {
      let serviceTitle = d.serviceTitle || 'Custom Tailoring Order';
      let orderType = d.orderType;
      let baseAmount = d.quotedAmount ?? 0;
      let turnaroundDays = 4;
      let resolvedTailorId: number | null = d.tailorId ?? null;

      if (d.serviceId) {
        const [sRows] = await conn.execute<RowDataPacket[]>(
          `SELECT * FROM services WHERE id = ? AND is_active = 1 LIMIT 1`,
          [d.serviceId],
        );
        if (sRows.length > 0) {
          serviceTitle = String(sRows[0].title);
          orderType = sRows[0].category as typeof d.orderType;
          baseAmount = Number(sRows[0].base_price);
          turnaroundDays = Number(sRows[0].turnaround_days || 4);
          if (!resolvedTailorId && sRows[0].tailor_id) {
            resolvedTailorId = Number(sRows[0].tailor_id);
          }
        }
      }

      if (baseAmount <= 0) {
        baseAmount = 799;
      }

      let tailorUserId: number | null = null;
      let tailorShopName: string | null = null;
      let commPct = defaultCommPct;
      let visitFeeRate = defaultVisitFee;

      if (resolvedTailorId) {
        const [tpRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, user_id, shop_name, commission_rate, home_visit_fee
           FROM tailor_profiles
           WHERE id = ? LIMIT 1`,
          [resolvedTailorId],
        );
        if (tpRows.length === 0) {
          const err = new Error('Selected tailor shop not found.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
        tailorUserId = Number(tpRows[0].user_id);
        tailorShopName = String(tpRows[0].shop_name);
        commPct = Number(tpRows[0].commission_rate || defaultCommPct);
        visitFeeRate = Number(tpRows[0].home_visit_fee ?? defaultVisitFee);
      }

      const visitFee =
        d.pickupMode === 'doorstep_pickup' && baseAmount < freeVisitMin ? visitFeeRate : 0;
      const totalAmount = Number((baseAmount + visitFee).toFixed(2));
      const commission = Number(((totalAmount * commPct) / 100).toFixed(2));
      const tailorPayout = Number((totalAmount - commission).toFixed(2));

      const pickupDt = new Date(`${d.pickupDate}T00:00:00`);
      const deliveryDt = Number.isNaN(pickupDt.getTime()) ? new Date() : new Date(pickupDt);
      deliveryDt.setDate(deliveryDt.getDate() + turnaroundDays);
      const deliveryIso = deliveryDt.toISOString().split('T')[0];

      const orderCode = generateOrderCode();
      const initialStatus = resolvedTailorId ? 'Visit Scheduled' : 'Booking Created';

      const [orderRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO orders (
           order_code, customer_id, tailor_id, service_id, service_title, order_type, status,
           quoted_amount, visit_fee, total_amount, platform_commission, tailor_payout,
           quote_approved, payment_status, pickup_mode, pickup_date, pickup_slot, delivery_date,
           locality, pickup_address, garment_notes, customer_requirements
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderCode,
          req.user!.id,
          resolvedTailorId,
          d.serviceId ?? null,
          serviceTitle,
          orderType,
          initialStatus,
          baseAmount,
          visitFee,
          totalAmount,
          commission,
          tailorPayout,
          d.pickupMode,
          d.pickupDate,
          d.pickupSlot,
          deliveryIso,
          d.locality || req.user!.locality,
          d.pickupAddress || req.user!.address || req.user!.locality,
          d.garmentNotes || null,
          d.customerRequirements || null,
        ],
      );

      const orderId = orderRes.insertId;

      await conn.execute(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES (?, NULL, ?, ?, ?)`,
        [
          orderId,
          initialStatus,
          req.user!.id,
          tailorShopName
            ? `Order placed with ${tailorShopName} (${d.pickupMode === 'doorstep_pickup' ? 'Doorstep Pickup' : 'Shop Visit'})`
            : 'Order placed into open nearby tailor dispatch queue',
        ],
      );

      const paymentCode = generatePaymentCode();
      await conn.execute(
        `INSERT INTO payments (
           payment_code, order_id, customer_id, tailor_id, amount, platform_fee, tailor_earning,
           payment_method, payment_status, payout_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unsettled')`,
        [
          paymentCode,
          orderId,
          req.user!.id,
          resolvedTailorId,
          totalAmount,
          commission,
          tailorPayout,
          d.paymentMethod,
        ],
      );

      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, category, related_order_id)
         VALUES (?, ?, ?, 'order', ?)`,
        [
          req.user!.id,
          `Order ${orderCode} Placed`,
          `Your booking for "${serviceTitle}" (${d.pickupDate}, ${d.pickupSlot}) is confirmed.`,
          orderId,
        ],
      );

      if (tailorUserId) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'order', ?)`,
          [
            tailorUserId,
            `New Booking ${orderCode}`,
            `${req.user!.fullName} booked "${serviceTitle}" for ${d.pickupDate} (${d.pickupSlot}).`,
            orderId,
          ],
        );
      }

      return { orderId, orderCode, totalAmount, deliveryDate: deliveryIso };
    });

    res.status(201).json({
      ...created,
      message: `Order ${created.orderCode} created successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// 5. APPROVE TAILOR QUOTATION (Unlocks Stitching)
router.patch(
  '/orders/:id/approve-quote',
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        res.status(400).json({ error: 'Invalid order ID.' });
        return;
      }

      await withTransaction(async (conn) => {
        const [rows] = await conn.execute<RowDataPacket[]>(
          `SELECT o.*, tp.user_id AS tailor_user_id
           FROM orders o
           LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
           WHERE o.id = ? AND o.customer_id = ? FOR UPDATE`,
          [orderId, req.user!.id],
        );
        if (rows.length === 0) {
          const err = new Error('Order not found.') as Error & { statusCode?: number };
          err.statusCode = 404;
          throw err;
        }
        const ord = rows[0];
        if (String(ord.status) === 'Cancelled' || String(ord.status) === 'Delivered') {
          const err = new Error('Quote approval is not available for this order state.') as Error & {
            statusCode?: number;
          };
          err.statusCode = 400;
          throw err;
        }

        await conn.execute(
          `UPDATE orders SET quote_approved = 1, status = 'Customer Approved' WHERE id = ?`,
          [orderId],
        );

        await conn.execute(
          `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
           VALUES (?, ?, 'Customer Approved', ?, ?)`,
          [
            orderId,
            ord.status,
            req.user!.id,
            `Customer approved quotation of ₹${Number(ord.total_amount).toLocaleString('en-IN')}`,
          ],
        );

        if (ord.tailor_user_id) {
          await conn.execute(
            `INSERT INTO notifications (user_id, title, message, category, related_order_id)
             VALUES (?, ?, ?, 'order', ?)`,
            [
              ord.tailor_user_id,
              `Quote Approved (${ord.order_code})`,
              `${req.user!.fullName} approved the quote of ₹${Number(ord.total_amount).toLocaleString('en-IN')}. You may now begin stitching.`,
              orderId,
            ],
          );
        }
      });

      res.json({ message: 'Quotation approved! Your tailor can now start stitching.' });
    } catch (err) {
      next(err);
    }
  },
);

// 6. CANCEL ORDER (Allowed before stitching starts)
router.patch('/orders/:id/cancel', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT o.*, tp.user_id AS tailor_user_id
         FROM orders o
         LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
         WHERE o.id = ? AND o.customer_id = ? FOR UPDATE`,
        [orderId, req.user!.id],
      );
      if (rows.length === 0) {
        const err = new Error('Order not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const ord = rows[0];
      const blocked = ['Stitching Started', 'Quality Check', 'Ready for Delivery', 'Delivered', 'Cancelled'];
      if (blocked.includes(String(ord.status))) {
        const err = new Error(
          `Orders in "${ord.status}" stage cannot be cancelled online.`,
        ) as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }

      await conn.execute(`UPDATE orders SET status = 'Cancelled' WHERE id = ?`, [orderId]);
      await conn.execute(
        `UPDATE payments SET payment_status = CASE WHEN payment_status = 'completed' THEN 'refunded' ELSE 'failed' END WHERE order_id = ?`,
        [orderId],
      );
      await conn.execute(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, note)
         VALUES (?, ?, 'Cancelled', ?, 'Cancelled by customer')`,
        [orderId, ord.status, req.user!.id],
      );

      if (ord.tailor_user_id) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'order', ?)`,
          [
            ord.tailor_user_id,
            `Order Cancelled (${ord.order_code})`,
            `${req.user!.fullName} cancelled booking ${ord.order_code}.`,
            orderId,
          ],
        );
      }
    });

    res.json({ message: 'Order cancelled.' });
  } catch (err) {
    next(err);
  }
});

// 7. RECORD PAYMENT FOR AN ORDER (Transactional)
const payOrderSchema = z.object({
  paymentMethod: z.enum(['upi', 'card', 'cash', 'netbanking', 'wallet']).default('upi'),
  transactionRef: z.string().trim().max(120).optional(),
});

router.post('/orders/:id/pay', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Invalid order ID.' });
      return;
    }

    const parsed = payOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment payload' });
      return;
    }

    const txRef =
      parsed.data.transactionRef?.trim() ||
      `TXN${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 89)}`;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT o.*, tp.user_id AS tailor_user_id
         FROM orders o
         LEFT JOIN tailor_profiles tp ON tp.id = o.tailor_id
         WHERE o.id = ? AND o.customer_id = ? FOR UPDATE`,
        [orderId, req.user!.id],
      );
      if (rows.length === 0) {
        const err = new Error('Order not found.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }

      const ord = rows[0];
      if (ord.payment_status === 'paid') {
        const err = new Error('This order is already paid.') as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }

      const [existingPays] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM payments WHERE order_id = ? LIMIT 1 FOR UPDATE`,
        [orderId],
      );

      if (existingPays.length > 0) {
        await conn.execute(
          `UPDATE payments
           SET payment_method = ?, payment_status = 'completed', transaction_ref = ?, paid_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [parsed.data.paymentMethod, txRef, existingPays[0].id],
        );
      } else {
        await conn.execute(
          `INSERT INTO payments (
             payment_code, order_id, customer_id, tailor_id, amount, platform_fee, tailor_earning,
             payment_method, payment_status, payout_status, transaction_ref, paid_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'unsettled', ?, CURRENT_TIMESTAMP)`,
          [
            generatePaymentCode(),
            orderId,
            req.user!.id,
            ord.tailor_id,
            ord.total_amount,
            ord.platform_commission,
            ord.tailor_payout,
            parsed.data.paymentMethod,
            txRef,
          ],
        );
      }

      await conn.execute(`UPDATE orders SET payment_status = 'paid' WHERE id = ?`, [orderId]);

      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, category, related_order_id)
         VALUES (?, ?, ?, 'payment', ?)`,
        [
          req.user!.id,
          `Payment Successful (${ord.order_code})`,
          `Payment of ₹${Number(ord.total_amount).toLocaleString('en-IN')} via ${parsed.data.paymentMethod.toUpperCase()} (Ref: ${txRef}) received.`,
          orderId,
        ],
      );

      if (ord.tailor_user_id) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category, related_order_id)
           VALUES (?, ?, ?, 'payment', ?)`,
          [
            ord.tailor_user_id,
            `Customer Paid for ${ord.order_code}`,
            `₹${Number(ord.total_amount).toLocaleString('en-IN')} received from ${req.user!.fullName}. Net payout ₹${Number(ord.tailor_payout).toLocaleString('en-IN')} queued for settlement.`,
            orderId,
          ],
        );
      }
    });

    res.json({ transactionRef: txRef, message: 'Payment completed and receipt recorded.' });
  } catch (err) {
    next(err);
  }
});

// 8. PAYMENT HISTORY
router.get('/payments', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT p.*, o.order_code, o.service_title, o.status AS order_status, tp.shop_name AS tailor_shop_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN tailor_profiles tp ON tp.id = p.tailor_id
       WHERE p.customer_id = ?
       ORDER BY p.created_at DESC`,
      [req.user!.id],
    );
    res.json({ payments: rows });
  } catch (err) {
    next(err);
  }
});

// 9. MEASUREMENT PROFILES (CRUD)
router.get('/measurements', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, label, garment_type, owner_name, measured_by, consent_saved, values_json, updated_at
       FROM measurement_profiles
       WHERE customer_id = ?
       ORDER BY updated_at DESC`,
      [req.user!.id],
    );
    res.json({
      measurements: rows.map((r) => ({
        id: Number(r.id),
        label: String(r.label),
        garmentType: String(r.garment_type),
        ownerName: String(r.owner_name),
        measuredBy: String(r.measured_by),
        consentSaved: Boolean(r.consent_saved),
        values:
          typeof r.values_json === 'string'
            ? JSON.parse(r.values_json)
            : (r.values_json as Record<string, string>),
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const measurementSchema = z.object({
  label: z.string().trim().min(2).max(120),
  garmentType: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(120),
  measuredBy: z.string().trim().max(120).default('Self Entered'),
  consentSaved: z.boolean().default(true),
  values: z.record(z.string(), z.string()),
});

router.post('/measurements', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = measurementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid measurement data' });
      return;
    }
    const d = parsed.data;
    const result = await executeSql(
      `INSERT INTO measurement_profiles (customer_id, label, garment_type, owner_name, measured_by, consent_saved, values_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user!.id,
        d.label,
        d.garmentType,
        d.ownerName,
        d.measuredBy,
        d.consentSaved ? 1 : 0,
        JSON.stringify(d.values),
      ],
    );
    res.status(201).json({ id: result.insertId, message: 'Measurement profile saved.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/measurements/:id', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid measurement ID.' });
      return;
    }
    const result = await executeSql(
      `DELETE FROM measurement_profiles WHERE id = ? AND customer_id = ?`,
      [id, req.user!.id],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Measurement profile not found.' });
      return;
    }
    res.json({ message: 'Measurement profile deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
