import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import commentRoutes from './routes/comments.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import shareRoutes from './routes/share.js';
import { errorHandler } from './middleware/errorHandler.js';
import pool from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const ensureSchema = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS products_sold TEXT');
  } catch (error) {
    console.error('Schema check error:', error);
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir le favicon si présent
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/share', shareRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Link API is running' });
});

// Error handler
app.use(errorHandler);

// Démarrer le serveur Express
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

ensureSchema();

