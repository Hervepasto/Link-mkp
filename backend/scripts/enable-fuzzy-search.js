import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'link_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function enableFuzzySearch() {
  try {
    // Activer l'extension pg_trgm pour la recherche floue
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log('✅ Extension pg_trgm activée pour la recherche floue');
    
    // Créer des index pour améliorer les performances
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
    `);
    console.log('✅ Index trigram créé sur products.name');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
    `);
    console.log('✅ Index trigram créé sur products.description');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_products_sold_trgm ON users USING gin (products_sold gin_trgm_ops);
    `);
    console.log('✅ Index trigram créé sur users.products_sold');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

enableFuzzySearch();
