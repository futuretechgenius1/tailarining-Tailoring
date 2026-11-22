import { Router, Response, NextFunction } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import {
  AuthedRequest,
  hashPassword,
  loadAuthUserById,
  requireAuth,
  safeEqualString,
  signAuthToken,
  verifyPassword,
} from '../auth';
import { ensureDatabaseReady, isDbConfigured, queryRows, withTransaction } from '../db';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().trim().email('Valid email address is required').max(190),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,20}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['customer', 'tailor']).default('customer'),
  locality: z.string().trim().min(2).max(160).default('Alkapur Township, Manikonda'),
  address: z.string().trim().max(400).optional(),
  // Tailor-specific fields
  shopName: z.string().trim().min(2).max(160).optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  workingHours: z.string().trim().max(120).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  homeVisitFee: z.coerce.number().min(0).max(1000).optional(),
});

const bootstrapOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,20}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  setupCode: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or mobile number is required').max(190),
  password: z.string().min(1, 'Password is required').max(128),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,20}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  locality: z.string().trim().min(2).max(160).optional(),
  address: z.string().trim().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

// Check DB status & whether first-run App Owner has been claimed
router.get('/bootstrap-status', async (_req, res: Response, next: NextFunction) => {
  try {
    const dbConfigured = isDbConfigured();
    if (!dbConfigured) {
      res.json({
        dbConfigured: false,
        dbConnected: false,
        hasAppOwner: false,
        requiresSetupCode: Boolean(process.env.APP_OWNER_SETUP_CODE?.trim()),
      });
      return;
    }

    await ensureDatabaseReady();
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM users WHERE role = 'owner'`,
    );
    const hasAppOwner = Number(rows[0]?.cnt || 0) > 0;
    res.json({
      dbConfigured: true,
      dbConnected: true,
      hasAppOwner,
      requiresSetupCode: Boolean(process.env.APP_OWNER_SETUP_CODE?.trim()),
    });
  } catch (err) {
    next(err);
  }
});

// One-time atomic App Owner bootstrap route (locks once an owner exists)
router.post('/bootstrap-owner', async (req, res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseReady();
    const parsed = bootstrapOwnerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }

    const expectedCode = process.env.APP_OWNER_SETUP_CODE?.trim();
    if (expectedCode) {
      const provided = (parsed.data.setupCode || '').trim();
      if (!provided || !safeEqualString(provided, expectedCode)) {
        res.status(403).json({ error: 'Invalid App Owner setup code.' });
        return;
      }
    }

    const emailNorm = parsed.data.email.toLowerCase();
    const phoneNorm = parsed.data.phone ? parsed.data.phone.trim() : null;
    const passwordHash = await hashPassword(parsed.data.password);

    const createdUserId = await withTransaction(async (conn) => {
      const [existingOwners] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM users WHERE role = 'owner' LIMIT 1 FOR UPDATE`,
      );
      if (existingOwners.length > 0) {
        const err = new Error('An App Owner account is already configured. Please sign in.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 409;
        throw err;
      }

      const [dup] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ? OR (? IS NOT NULL AND phone = ?) LIMIT 1`,
        [emailNorm, phoneNorm, phoneNorm],
      );
      if (dup.length > 0) {
        const err = new Error('An account with this email or mobile number already exists.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 409;
        throw err;
      }

      const [insertRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, locality)
         VALUES (?, ?, ?, ?, 'owner', 'active', 'Hyderabad HQ')`,
        [parsed.data.fullName, emailNorm, phoneNorm, passwordHash],
      );

      const userId = insertRes.insertId;
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, category)
         VALUES (?, ?, ?, 'system')`,
        [
          userId,
          'App Owner Console Initialized',
          'Your Tailering App Owner account is active. You can now manage tailors, customers, services, orders, payments, and platform settings.',
        ],
      );

      return userId;
    });

    const user = await loadAuthUserById(createdUserId);
    const token = signAuthToken({ userId: createdUserId, role: 'owner' });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Register Customer or Tailor Partner (transactional)
router.post('/register', async (req, res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseReady();
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
      return;
    }

    const d = parsed.data;
    const emailNorm = d.email.toLowerCase();
    const phoneNorm = d.phone && d.phone.trim().length > 0 ? d.phone.trim() : null;

    if (d.role === 'tailor' && (!d.shopName || d.shopName.trim().length < 2)) {
      res.status(400).json({ error: 'Shop / Boutique name is required for tailor registration.' });
      return;
    }

    const passwordHash = await hashPassword(d.password);

    const userId = await withTransaction(async (conn) => {
      const [existing] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ? OR (? IS NOT NULL AND phone = ?) LIMIT 1`,
        [emailNorm, phoneNorm, phoneNorm],
      );
      if (existing.length > 0) {
        const err = new Error('An account with this email or mobile number already exists.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 409;
        throw err;
      }

      const [userRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO users (full_name, email, phone, password_hash, role, status, locality, address)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          d.fullName,
          emailNorm,
          phoneNorm,
          passwordHash,
          d.role,
          d.locality,
          d.address || null,
        ],
      );

      const newUserId = userRes.insertId;

      if (d.role === 'tailor') {
        const specialties =
          d.specialties && d.specialties.length > 0
            ? d.specialties
            : ['Blouse Stitching', 'Alterations', 'Custom Kurtis'];
        const [tpRes] = await conn.execute<ResultSetHeader>(
          `INSERT INTO tailor_profiles
             (user_id, shop_name, master_tailor, bio, locality, address, specialties_json, working_hours, experience_years, home_visit_fee, pickup_available, is_available, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
          [
            newUserId,
            d.shopName!.trim(),
            d.fullName,
            `Bespoke tailoring and alteration atelier serving ${d.locality}.`,
            d.locality,
            d.address || d.locality,
            JSON.stringify(specialties),
            d.workingHours || '10:00 AM – 08:30 PM',
            d.experienceYears ?? 5,
            d.homeVisitFee ?? 49,
          ],
        );

        const tailorId = tpRes.insertId;
        // Create 2 initial customizable services linked to this tailor
        await conn.execute(
          `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
           VALUES
             (?, 'Designer Blouse Stitching', 'bridal', 'Custom-fitted blouse with lining and doorstep fitting.', 1199, 4, 1),
             (?, 'Express Garment Alteration', 'alteration', 'Waist adjustment, hem shortening, and sleeve tapering.', 299, 2, 1)`,
          [tailorId, tailorId],
        );

        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category)
           VALUES (?, ?, ?, 'account')`,
          [
            newUserId,
            'Welcome to Tailering Partner Portal',
            `Your atelier "${d.shopName!.trim()}" is live. Customize your services, pricing, and availability from your Tailor Dashboard.`,
          ],
        );
      } else {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, category)
           VALUES (?, ?, ?, 'account')`,
          [
            newUserId,
            'Welcome to Tailering',
            'Your customer account is ready. Browse verified local tailors, place orders, and track real-time stitching progress.',
          ],
        );
      }

      return newUserId;
    });

    const user = await loadAuthUserById(userId);
    const token = signAuthToken({ userId, role: d.role });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Sign In (email or phone + password)
router.post('/login', async (req, res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseReady();
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid login details' });
      return;
    }

    const idNorm = parsed.data.identifier.trim().toLowerCase();
    const rawId = parsed.data.identifier.trim();

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, password_hash, role, status
       FROM users
       WHERE LOWER(email) = ? OR phone = ?
       LIMIT 1`,
      [idNorm, rawId],
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }

    const row = rows[0];
    const match = await verifyPassword(parsed.data.password, String(row.password_hash));
    if (!match) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }

    if (row.status === 'suspended') {
      res.status(403).json({ error: 'This account is suspended. Please contact the App Owner.' });
      return;
    }

    const user = await loadAuthUserById(Number(row.id));
    if (!user) {
      res.status(401).json({ error: 'Account could not be loaded.' });
      return;
    }

    const token = signAuthToken({ userId: user.id, role: user.role });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Get current authenticated user
router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Update current user profile
router.patch('/profile', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile update' });
      return;
    }

    const d = parsed.data;
    const phoneNorm = d.phone !== undefined ? (d.phone.trim() ? d.phone.trim() : null) : undefined;

    await withTransaction(async (conn) => {
      if (phoneNorm) {
        const [dup] = await conn.execute<RowDataPacket[]>(
          `SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1`,
          [phoneNorm, req.user!.id],
        );
        if (dup.length > 0) {
          const err = new Error('That mobile number is already linked to another account.') as Error & {
            statusCode?: number;
          };
          err.statusCode = 409;
          throw err;
        }
      }

      await conn.execute(
        `UPDATE users
         SET full_name = COALESCE(?, full_name),
             phone = CASE WHEN ? THEN ? ELSE phone END,
             locality = COALESCE(?, locality),
             address = COALESCE(?, address)
         WHERE id = ?`,
        [
          d.fullName ?? null,
          phoneNorm !== undefined ? 1 : 0,
          phoneNorm ?? null,
          d.locality ?? null,
          d.address ?? null,
          req.user!.id,
        ],
      );
    });

    const updated = await loadAuthUserById(req.user!.id);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// Change password
router.post('/change-password', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password input' });
      return;
    }

    const rows = await queryRows<RowDataPacket[]>(
      `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
      [req.user!.id],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const ok = await verifyPassword(parsed.data.currentPassword, String(rows[0].password_hash));
    if (!ok) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await withTransaction(async (conn) => {
      await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [
        newHash,
        req.user!.id,
      ]);
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, category)
         VALUES (?, 'Password Updated', 'Your account password was changed successfully.', 'account')`,
        [req.user!.id],
      );
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
