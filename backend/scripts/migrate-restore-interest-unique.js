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

    // Nettoyer les doublons avant d'ajouter la contrainte
    console.log('🧹 Nettoyage des doublons...');
    await client.query(`
      DELETE FROM product_interests pi1
      WHERE pi1.id NOT IN (
        SELECT pi2.id
        FROM (
          SELECT DISTINCT ON (product_id, user_id) id
          FROM product_interests
          ORDER BY product_id, user_id, created_at ASC
        ) pi2
      )
    `);
    console.log('✅ Doublons supprimés\n');

    // Lire le script SQL
    const sqlPath = path.join(__dirname, 'migrate-restore-interest-unique.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter la migration
    await client.query(sql);
    console.log('✅ Migration exécutée avec succès!\n');

    // Vérifier les contraintes
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'product_interests'::regclass
      AND contype = 'u'
    `);

    if (constraints.rows.length > 0) {
      console.log('✅ Contrainte UNIQUE restaurée avec succès!');
      constraints.rows.forEach(row => {
        console.log(`   ${row.constraint_name}`);
      });
    }

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
