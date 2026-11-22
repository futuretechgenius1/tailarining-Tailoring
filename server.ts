import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDatabaseReady, isDbConfigured } from './server/db';
import authRoutes from './server/routes/authRoutes';
import publicRoutes from './server/routes/publicRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import ownerRoutes from './server/routes/ownerRoutes';
import tailorRoutes from './server/routes/tailorRoutes';
import customerRoutes from './server/routes/customerRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);

  // Strict JSON body limit
  app.use(express.json({ limit: '1mb' }));

  // Health & DB readiness endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    const configured = isDbConfigured();
    if (!configured) {
      res.json({ status: 'ok', dbConfigured: false, dbConnected: false });
      return;
    }
    try {
      await ensureDatabaseReady();
      res.json({ status: 'ok', dbConfigured: true, dbConnected: true });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        dbConfigured: true,
        dbConnected: false,
        error: err instanceof Error ? err.message : 'Database connection failed',
      });
    }
  });

  // Mount Role-Based REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api/tailor', tailorRoutes);
  app.use('/api/customer', customerRoutes);

  // 404 handler for unknown /api/* paths
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global API error handler
  app.use(
    (
      err: Error & { statusCode?: number; code?: string },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      if (err.code === 'DB_NOT_CONFIGURED') {
        res.status(503).json({ error: err.message, code: 'DB_NOT_CONFIGURED' });
        return;
      }
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ error: 'A record with this unique value already exists.' });
        return;
      }
      const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
      const message = status >= 500 ? 'Internal server error. Please try again.' : err.message;
      if (status >= 500) {
        console.error('[Tailering API Error]', err.message);
      }
      res.status(status).json({ error: message });
    },
  );

  // Mount Vite middleware in development or serve built dist/ in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Initialize MySQL schema automatically on boot if credentials are configured
  if (isDbConfigured()) {
    try {
      await ensureDatabaseReady();
      console.log('[Tailering] MySQL database connected and schema verified.');
    } catch (err) {
      console.error(
        '[Tailering] Initial MySQL connection warning:',
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.log(
      '[Tailering] Running without MYSQL_* env vars yet. Configure MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in Settings -> Secrets.',
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tailering] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Tailering] Fatal startup error:', err);
  process.exit(1);
});
