import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Se connecter à la DB par défaut
  });

  try {
    console.log('🔄 Initializing database...');
    
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    const dbName = process.env.DB_NAME || 'link_marketplace';
    
    // Vérifier si la base de données existe
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      // Créer la base de données
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists`);
    }

    await adminClient.end();

    // Maintenant se connecter à la nouvelle base de données et exécuter le schéma
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName,
    });

    await dbClient.connect();
    console.log(`✅ Connected to database "${dbName}"`);

    // Lire et exécuter le schéma
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Exécuter le schéma
    await dbClient.query(schema);
    console.log('✅ Schema executed successfully');

    // Vérifier les tables créées
    const tables = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📊 Tables created:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Vérifier les index
    const indexes = await dbClient.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);

    console.log(`\n📇 Indexes created: ${indexes.rows.length}`);

    // Vérifier les fonctions
    const functions = await dbClient.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);

    console.log(`\n⚙️  Functions created: ${functions.rows.length}`);

    await dbClient.end();
    
    console.log('\n✅ Database initialization completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

initDatabase();
