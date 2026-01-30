import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'link_marketplace',
  });

  try {
    console.log('🔄 Démarrage de la migration...\n');
    
    await client.connect();
    console.log('✅ Connecté à la base de données\n');

    // Lire le script SQL
    const sqlPath = path.join(__dirname, 'migrate-whatsapp-auth.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter la migration
    await client.query(sql);
    console.log('✅ Migration exécutée avec succès!\n');

    // Vérifier les changements
    const result = await client.query(`
      SELECT 
        column_name, 
        is_nullable, 
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email', 'whatsapp_number')
      ORDER BY column_name
    `);

    console.log('📊 État de la table users:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Vérifier les contraintes UNIQUE
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        a.attname as column_name
      FROM pg_constraint con
      INNER JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
      WHERE con.conrelid = 'users'::regclass
      AND con.contype = 'u'
    `);

    console.log('\n🔑 Contraintes UNIQUE:');
    constraints.rows.forEach(row => {
      console.log(`   ${row.constraint_name} sur ${row.column_name}`);
    });

    console.log('\n✅ Migration terminée avec succès!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.error('Détails:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateDatabase();
