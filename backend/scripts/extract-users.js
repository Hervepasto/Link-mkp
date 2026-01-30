import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le dossier backend
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'link_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function extractUsers() {
  try {
    console.log('🔍 Extraction des comptes utilisateurs...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        user_type,
        account_type,
        country,
        city,
        neighborhood,
        whatsapp_number,
        gender,
        age,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ Aucun compte trouvé dans la base de données.\n');
      await pool.end();
      return;
    }

    console.log(`✅ ${result.rows.length} compte(s) trouvé(s):\n`);
    console.log('='.repeat(80));
    
    result.rows.forEach((user, index) => {
      console.log(`\n📧 Compte #${index + 1}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nom complet: ${user.first_name} ${user.last_name}`);
      console.log(`   Type: ${user.user_type}`);
      if (user.account_type) {
        console.log(`   Type de compte: ${user.account_type}`);
      }
      if (user.country || user.city || user.neighborhood) {
        console.log(`   Localisation: ${[user.country, user.city, user.neighborhood].filter(Boolean).join(', ')}`);
      }
      if (user.whatsapp_number) {
        console.log(`   WhatsApp: ${user.whatsapp_number}`);
      }
      if (user.gender) {
        console.log(`   Genre: ${user.gender}`);
      }
      if (user.age) {
        console.log(`   Âge: ${user.age}`);
      }
      console.log(`   Date de création: ${new Date(user.created_at).toLocaleString('fr-FR')}`);
      console.log(`   ID: ${user.id}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  IMPORTANT: Les mots de passe sont hashés avec bcrypt et ne peuvent pas être récupérés en clair.');
    console.log('   Pour réinitialiser un mot de passe, utilisez la fonctionnalité "Mot de passe oublié" ou créez un nouveau compte.\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction:', error.message);
    console.error('Détails:', error);
    await pool.end();
    process.exit(1);
  }
}

extractUsers();
