import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Safely parses and clamps ?page and ?limit query params so callers
 * can never trigger negative offsets or unbounded table scans.
 */
export function parsePagination(
  query: Request['query'],
  defaultLimit = 10,
  maxLimit = 50,
): PaginationParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(Math.floor(rawPage), 10000) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Shared strong password validator (min 8 chars, at least 1 letter & 1 number).
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
    message: 'Password must contain at least one letter and one number',
  });

/**
 * Baseline HTTP security headers (iframe-compatible: avoids X-Frame-Options).
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  if (req.path.startsWith('/api/')) {
    if (req.path.startsWith('/api/public/')) {
      res.setHeader('Cache-Control', 'private, max-age=15');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
  }
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight sliding-window in-memory rate limiter with automatic expiry pruning.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}) {
  const buckets = new Map<string, RateBucket>();
  let lastPrune = Date.now();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    if (now - lastPrune > 60_000 || buckets.size > 5000) {
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      lastPrune = now;
    }

    const clientIp =
      (typeof req.ip === 'string' && req.ip) ||
      req.socket?.remoteAddress ||
      'unknown';
    const key = `${options.keyPrefix}:${clientIp}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', String(options.max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - 1)));
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, options.max - existing.count);
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (existing.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error:
          options.message ||
          `Too many requests. Please wait ${retryAfterSec} seconds and try again.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    next();
  };
}

export const ALLOWED_PORTFOLIO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PortfolioMimeType = (typeof ALLOWED_PORTFOLIO_MIMES)[number];

/**
 * Verifies binary image magic bytes match the declared safe MIME type
 * (blocks disguised SVG, HTML, or script payloads).
 */
export function validatePortfolioImageBuffer(
  buffer: Buffer,
  mimeType: PortfolioMimeType,
): { valid: boolean; reason?: string } {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    return { valid: false, reason: 'Uploaded image file is empty or corrupted.' };
  }
  if (buffer.length > 1.5 * 1024 * 1024) {
    return { valid: false, reason: 'Image exceeds the 1.5 MB size limit after compression.' };
  }

  if (mimeType === 'image/jpeg') {
    const ok = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    return ok ? { valid: true } : { valid: false, reason: 'Invalid JPEG file signature.' };
  }
  if (mimeType === 'image/png') {
    const ok =
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    return ok ? { valid: true } : { valid: false, reason: 'Invalid PNG file signature.' };
  }
  if (mimeType === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const webp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return riff && webp ? { valid: true } : { valid: false, reason: 'Invalid WebP file signature.' };
  }
  return { valid: false, reason: 'Unsupported image format. Please upload JPG, PNG, or WebP.' };
}

const PREVIEW_SIGNING_SECRET =
  process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

export function signPortfolioPreviewToken(itemId: number, tailorId: number): string {
  return crypto
    .createHmac('sha256', PREVIEW_SIGNING_SECRET)
    .update(`portfolio:${itemId}:${tailorId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyPortfolioPreviewToken(
  itemId: number,
  tailorId: number,
  token: string,
): boolean {
  if (!token || token.length !== 32) return false;
  const expected = signPortfolioPreviewToken(itemId, tailorId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(token, 'utf8'));
  } catch {
    return false;
  }
}
