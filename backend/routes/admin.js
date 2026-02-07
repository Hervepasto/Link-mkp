import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const usersCountResult = await pool.query(
      'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE user_type = \'seller\')::int AS sellers, COUNT(*) FILTER (WHERE user_type = \'buyer\')::int AS buyers FROM users'
    );

    const postsCountResult = await pool.query(
      `SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE post_type = 'announcement')::int AS announcements,
        COUNT(*) FILTER (WHERE post_type = 'need')::int AS needs,
        COUNT(*) FILTER (WHERE post_type = 'product' OR post_type IS NULL)::int AS products
      FROM products`
    );

    const viewsResult = await pool.query(
      'SELECT COALESCE(SUM(views_count), 0)::int AS views_total, COALESCE(SUM(interested_count), 0)::int AS interested_total FROM products'
    );

    const recentsResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS posts_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS posts_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS posts_month
       FROM products`
    );

    const usersRecentsResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS users_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS users_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS users_month
       FROM users`
    );

    const topProductsResult = await pool.query(
      `SELECT id, name, views_count, interested_count, created_at
       FROM products
       ORDER BY views_count DESC NULLS LAST, created_at DESC
       LIMIT 5`
    );

    const topSellersResult = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(p.id)::int AS posts_count,
        COALESCE(SUM(p.views_count), 0)::int AS views_total
       FROM users u
       LEFT JOIN products p ON p.seller_id = u.id
       WHERE u.user_type = 'seller'
       GROUP BY u.id
       ORDER BY posts_count DESC, views_total DESC
       LIMIT 5`
    );

    const dailyUsersResult = await pool.query(
      `SELECT 
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
        COUNT(*)::int AS count
       FROM users
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY 1
       ORDER BY 1`
    );

    const dailyPostsResult = await pool.query(
      `SELECT 
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
        COUNT(*)::int AS count
       FROM products
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY 1
       ORDER BY 1`
    );

    res.json({
      users: usersCountResult.rows[0],
      posts: postsCountResult.rows[0],
      totals: viewsResult.rows[0],
      recents: recentsResult.rows[0],
      newUsers: usersRecentsResult.rows[0],
      topProducts: topProductsResult.rows,
      topSellers: topSellersResult.rows,
      dailyUsers: dailyUsersResult.rows,
      dailyPosts: dailyPostsResult.rows
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
