import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Obtenir le profil de l'utilisateur connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, user_type, account_type, 
       country, city, neighborhood, whatsapp_number, gender, age, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le profil d'un utilisateur par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, first_name, last_name, user_type, account_type, 
       country, city, neighborhood, whatsapp_number, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le profil
router.put('/me', authenticate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      accountType,
      country,
      city,
      neighborhood,
      whatsappNumber,
      gender,
      age
    } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           account_type = COALESCE($3, account_type),
           country = COALESCE($4, country),
           city = COALESCE($5, city),
           neighborhood = COALESCE($6, neighborhood),
           whatsapp_number = COALESCE($7, whatsapp_number),
           gender = COALESCE($8, gender),
           age = COALESCE($9, age)
       WHERE id = $10
       RETURNING id, email, first_name, last_name, user_type, account_type, 
                 country, city, neighborhood, whatsapp_number, gender, age`,
      [firstName, lastName, accountType, country, city, neighborhood,
       whatsappNumber, gender, age, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer son compte
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Supprimer les images des produits de l'utilisateur
    await pool.query(
      `DELETE FROM product_images 
       WHERE product_id IN (SELECT id FROM products WHERE seller_id = $1)`,
      [userId]
    );

    // Supprimer les intérêts sur les produits de l'utilisateur
    await pool.query(
      `DELETE FROM product_interests 
       WHERE product_id IN (SELECT id FROM products WHERE seller_id = $1)`,
      [userId]
    );

    // Supprimer les vues sur les produits de l'utilisateur
    await pool.query(
      `DELETE FROM product_views 
       WHERE product_id IN (SELECT id FROM products WHERE seller_id = $1)`,
      [userId]
    );

    // Supprimer les intérêts de l'utilisateur sur d'autres produits
    await pool.query(
      `DELETE FROM product_interests WHERE user_id = $1`,
      [userId]
    );

    // Supprimer les vues de l'utilisateur
    await pool.query(
      `DELETE FROM product_views WHERE user_id = $1`,
      [userId]
    );

    // Supprimer les produits de l'utilisateur
    await pool.query(
      `DELETE FROM products WHERE seller_id = $1`,
      [userId]
    );

    // Supprimer l'utilisateur
    await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [userId]
    );

    res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
});

export default router;
