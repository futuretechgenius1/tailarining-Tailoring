import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { AuthedRequest, requireAuth } from '../auth';
import { executeSql, queryRows } from '../db';
import { buildPaginationMeta, parsePagination } from '../security';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, 12, 50);

    const [statsRows, rows] = await Promise.all([
      queryRows<RowDataPacket[]>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread_count
         FROM notifications
         WHERE user_id = ?`,
        [req.user!.id],
      ),
      queryRows<RowDataPacket[]>(
        `SELECT id, title, message, category, is_read, related_order_id, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [req.user!.id],
      ),
    ]);

    const total = Number(statsRows[0]?.total || 0);
    const unreadCount = Number(statsRows[0]?.unread_count || 0);

    res.json({
      unreadCount,
      pagination: buildPaginationMeta(page, limit, total),
      notifications: rows.map((r) => ({
        id: Number(r.id),
        title: String(r.title),
        message: String(r.message),
        category: String(r.category),
        isRead: Boolean(r.is_read),
        relatedOrderId: r.related_order_id ? Number(r.related_order_id) : null,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid notification ID.' });
      return;
    }

    await executeSql(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, req.user!.id],
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    await executeSql(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user!.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
