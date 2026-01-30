import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config();

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend folder
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'link_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  try {
    console.log('🔄 Application de la migration pour le repartage...\n');
    
    const sqlPath = path.join(__dirname, 'migrate-add-repost.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration appliquée avec succès !\n');
    console.log('📋 Table product_reposts créée pour gérer les repartages.\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    console.error('Détails:', error);
    await pool.end();
    process.exit(1);
  }
}

migrate();
