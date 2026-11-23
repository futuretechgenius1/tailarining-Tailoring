import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { queryRows } from './db';

export type DbUserRole = 'owner' | 'tailor' | 'customer';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: DbUserRole;
  status: 'active' | 'suspended' | 'pending';
  locality: string;
  address: string | null;
  tailorProfileId?: number | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

// Signing key strictly from process.env with ephemeral in-memory random fallback
const JWT_SIGNING_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16
    ? process.env.JWT_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const JWT_EXPIRES_IN = '12h';
const JWT_ISSUER = 'tailering-api';
const JWT_AUDIENCE = 'tailering-app';

// In-memory JWT revocation denylist (jti -> expiry timestamp ms)
const revokedTokenJtis = new Map<string, number>();

function pruneRevokedTokens(): void {
  const now = Date.now();
  for (const [jti, expMs] of revokedTokenJtis.entries()) {
    if (expMs <= now) revokedTokenJtis.delete(jti);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload: { userId: number; role: DbUserRole }): string {
  return jwt.sign(payload, JWT_SIGNING_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: crypto.randomUUID(),
  });
}

export function verifyAuthToken(token: string): {
  userId: number;
  role: DbUserRole;
  jti?: string;
  exp?: number;
} {
  const decoded = jwt.verify(token, JWT_SIGNING_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as { userId?: unknown; role?: unknown; jti?: unknown; exp?: unknown };

  if (
    typeof decoded?.userId !== 'number' ||
    (decoded.role !== 'owner' && decoded.role !== 'tailor' && decoded.role !== 'customer')
  ) {
    throw new Error('Invalid token payload');
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
    jti: typeof decoded.jti === 'string' ? decoded.jti : undefined,
    exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
  };
}

export function revokeAuthToken(token: string): void {
  pruneRevokedTokens();
  try {
    const decoded = verifyAuthToken(token);
    if (decoded.jti) {
      const expMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 12 * 3600 * 1000;
      revokedTokenJtis.set(decoded.jti, expMs);
    }
  } catch {
    // Token already invalid or expired
  }
}

export function isTokenRevoked(jti?: string): boolean {
  if (!jti) return false;
  const expMs = revokedTokenJtis.get(jti);
  if (!expMs) return false;
  if (expMs <= Date.now()) {
    revokedTokenJtis.delete(jti);
    return false;
  }
  return true;
}

export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function loadAuthUserById(userId: number): Promise<AuthUser | null> {
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.locality, u.address,
            tp.id AS tailor_profile_id
     FROM users u
     LEFT JOIN tailor_profiles tp ON tp.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    fullName: String(r.full_name),
    email: String(r.email),
    phone: r.phone ? String(r.phone) : null,
    role: r.role as DbUserRole,
    status: r.status as 'active' | 'suspended' | 'pending',
    locality: String(r.locality),
    address: r.address ? String(r.address) : null,
    tailorProfileId: r.tailor_profile_id ? Number(r.tailor_profile_id) : null,
  };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Missing authentication token.' });
      return;
    }

    let decoded: { userId: number; role: DbUserRole; jti?: string };
    try {
      decoded = verifyAuthToken(token);
    } catch {
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      return;
    }

    if (isTokenRevoked(decoded.jti)) {
      res.status(401).json({ error: 'Session has been signed out. Please sign in again.' });
      return;
    }

    const user = await loadAuthUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Contact platform support.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: DbUserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. This resource requires one of these roles: ${allowedRoles.join(', ')}.`,
      });
      return;
    }
    next();
  };
}
