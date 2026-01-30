import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Obtenir les commentaires d'un produit
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        c.*,
        u.first_name || ' ' || u.last_name as user_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.product_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), parseInt(offset)]
    );

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un commentaire
router.post('/', authenticate, [
  body('productId').isUUID(),
  body('content').trim().notEmpty().isLength({ min: 1, max: 1000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, content } = req.body;

    // Vérifier que le produit existe
    const productCheck = await pool.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Créer le commentaire
    const commentResult = await pool.query(
      `INSERT INTO comments (product_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, req.user.id, content]
    );

    const comment = commentResult.rows[0];

    // Créer une notification pour le vendeur
    const sellerId = productCheck.rows[0].seller_id;
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'comment', $2, $3)`,
      [
        sellerId,
        `${req.user.first_name} ${req.user.last_name} a commenté votre produit`,
        productId
      ]
    );

    res.status(201).json({ 
      message: 'Commentaire ajouté',
      comment 
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un commentaire
router.put('/:id', authenticate, [
  body('content').trim().notEmpty().isLength({ min: 1, max: 1000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Vérifier que le commentaire appartient à l'utilisateur
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    if (commentCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const result = await pool.query(
      `UPDATE comments SET content = $1 WHERE id = $2 RETURNING *`,
      [content, id]
    );

    res.json({ 
      message: 'Commentaire mis à jour',
      comment: result.rows[0] 
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un commentaire
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    if (commentCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Commentaire supprimé' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les notifications de l'utilisateur
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, is_read ASC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
