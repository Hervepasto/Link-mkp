import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Inscription
router.post('/register', [
  body('whatsappNumber').trim().notEmpty().withMessage('Le numéro WhatsApp est requis'),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('userType').isIn(['seller', 'buyer']),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      userType,
      accountType,
      country,
      city,
      neighborhood,
      whatsappNumber,
      gender,
      age,
      productsSold
    } = req.body;

    // Vérifier si le numéro WhatsApp existe déjà
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE whatsapp_number = $1',
      [whatsappNumber]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro WhatsApp est déjà utilisé' });
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, user_type, account_type, 
        country, city, neighborhood, whatsapp_number, gender, age, products_sold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, email, whatsapp_number, first_name, last_name, user_type, account_type, country, city, neighborhood, products_sold`,
      [email || null, passwordHash, firstName, lastName, userType, accountType || null,
       country || null, city || null, neighborhood || null, whatsappNumber,
       gender || null, age || null, productsSold || null]
    );

    const user = result.rows[0];

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
router.post('/login', [
  body('whatsappNumber').trim().notEmpty().withMessage('Le numéro WhatsApp est requis'),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { whatsappNumber, password } = req.body;

    // Trouver l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE whatsapp_number = $1',
      [whatsappNumber]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Numéro WhatsApp ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Numéro WhatsApp ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        whatsappNumber: user.whatsapp_number,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        accountType: user.account_type,
        country: user.country,
        city: user.city,
        neighborhood: user.neighborhood
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Obtenir les informations de l'utilisateur connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, whatsapp_number, first_name, last_name, user_type, 
              account_type, country, city, neighborhood, gender, age, products_sold
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        whatsapp_number: user.whatsapp_number,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        account_type: user.account_type,
        country: user.country,
        city: user.city,
        neighborhood: user.neighborhood,
        gender: user.gender,
        age: user.age,
        products_sold: user.products_sold
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
