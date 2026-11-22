import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { AuthedRequest, requireAuth } from '../auth';
import { executeSql, queryRows } from '../db';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT id, title, message, category, is_read, related_order_id, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 60`,
      [req.user!.id],
    );

    const unreadCount = rows.filter((r) => !r.is_read).length;
    res.json({
      unreadCount,
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
