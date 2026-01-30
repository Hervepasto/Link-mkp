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

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.yellow}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

async function testAutocomplete() {
  log.title('TEST DE L\'AUTOCOMPLÉTION');
  
  try {
    // 1. Vérifier les données existantes
    log.info('Vérification des données existantes dans la BD...\n');
    
    // Pays
    const countries = await pool.query(`
      SELECT DISTINCT country, COUNT(*) as count
      FROM (
        SELECT country FROM users WHERE country IS NOT NULL AND country != ''
        UNION ALL
        SELECT country FROM products WHERE country IS NOT NULL AND country != ''
      ) combined
      GROUP BY country
      ORDER BY count DESC
    `);
    
    console.log('📍 PAYS dans la BD:');
    if (countries.rows.length === 0) {
      log.warn('Aucun pays trouvé');
    } else {
      countries.rows.forEach(r => console.log(`   - ${r.country} (${r.count} entrées)`));
    }
    
    // Villes
    const cities = await pool.query(`
      SELECT DISTINCT city, country, COUNT(*) as count
      FROM (
        SELECT city, country FROM users WHERE city IS NOT NULL AND city != ''
        UNION ALL
        SELECT city, country FROM products WHERE city IS NOT NULL AND city != ''
      ) combined
      GROUP BY city, country
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('\n🏙️  VILLES dans la BD:');
    if (cities.rows.length === 0) {
      log.warn('Aucune ville trouvée');
    } else {
      cities.rows.forEach(r => console.log(`   - ${r.city} (${r.country}) - ${r.count} entrées`));
    }
    
    // Quartiers
    const neighborhoods = await pool.query(`
      SELECT DISTINCT neighborhood, city, COUNT(*) as count
      FROM (
        SELECT neighborhood, city FROM users WHERE neighborhood IS NOT NULL AND neighborhood != ''
        UNION ALL
        SELECT neighborhood, city FROM products WHERE neighborhood IS NOT NULL AND neighborhood != ''
      ) combined
      GROUP BY neighborhood, city
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('\n🏘️  QUARTIERS dans la BD:');
    if (neighborhoods.rows.length === 0) {
      log.warn('Aucun quartier trouvé');
    } else {
      neighborhoods.rows.forEach(r => console.log(`   - ${r.neighborhood} (${r.city}) - ${r.count} entrées`));
    }

    // 2. Test des requêtes d'autocomplétion
    log.title('TEST DES REQUÊTES D\'AUTOCOMPLÉTION');
    
    // Test recherche pays commençant par "C"
    console.log('\n🔍 Test: Pays commençant par "C"');
    const testCountries = await pool.query(`
      SELECT DISTINCT country as value
      FROM (
        SELECT country FROM users WHERE country IS NOT NULL AND country != ''
        UNION
        SELECT country FROM products WHERE country IS NOT NULL AND country != ''
      ) combined
      WHERE LOWER(country) LIKE 'c%'
      ORDER BY country
      LIMIT 10
    `);
    
    if (testCountries.rows.length > 0) {
      log.success(`Trouvé ${testCountries.rows.length} pays: ${testCountries.rows.map(r => r.value).join(', ')}`);
    } else {
      log.warn('Aucun pays trouvé commençant par "C"');
    }
    
    // Test recherche villes commençant par "Y"
    console.log('\n🔍 Test: Villes commençant par "Y"');
    const testCities = await pool.query(`
      SELECT DISTINCT city as value
      FROM (
        SELECT city FROM users WHERE city IS NOT NULL AND city != ''
        UNION
        SELECT city FROM products WHERE city IS NOT NULL AND city != ''
      ) combined
      WHERE LOWER(city) LIKE 'y%'
      ORDER BY city
      LIMIT 10
    `);
    
    if (testCities.rows.length > 0) {
      log.success(`Trouvé ${testCities.rows.length} villes: ${testCities.rows.map(r => r.value).join(', ')}`);
    } else {
      log.warn('Aucune ville trouvée commençant par "Y"');
    }
    
    // Test recherche quartiers d'une ville spécifique
    if (cities.rows.length > 0) {
      const testCity = cities.rows[0].city;
      console.log(`\n🔍 Test: Quartiers de "${testCity}"`);
      
      const testNeighborhoods = await pool.query(`
        SELECT DISTINCT neighborhood as value
        FROM (
          SELECT neighborhood, city FROM users WHERE neighborhood IS NOT NULL AND neighborhood != ''
          UNION
          SELECT neighborhood, city FROM products WHERE neighborhood IS NOT NULL AND neighborhood != ''
        ) combined
        WHERE LOWER(city) = LOWER($1)
        ORDER BY neighborhood
        LIMIT 10
      `, [testCity]);
      
      if (testNeighborhoods.rows.length > 0) {
        log.success(`Trouvé ${testNeighborhoods.rows.length} quartiers: ${testNeighborhoods.rows.map(r => r.value).join(', ')}`);
      } else {
        log.warn(`Aucun quartier trouvé pour "${testCity}"`);
      }
    }

    // 3. Test de l'API via HTTP
    log.title('TEST DE L\'API HTTP');
    
    const API_URL = 'http://localhost:5000/api';
    
    // Test endpoint pays
    console.log('\n🌐 Test API: /search/autocomplete/countries?q=c');
    try {
      const response = await fetch(`${API_URL}/search/autocomplete/countries?q=c`);
      const data = await response.json();
      if (response.ok) {
        log.success(`API OK - Résultats: ${JSON.stringify(data)}`);
      } else {
        log.error(`API Error: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      log.error(`Impossible de contacter l'API: ${e.message}`);
      log.warn('Assurez-vous que le serveur backend est lancé sur le port 5000');
    }
    
    // Test endpoint villes
    console.log('\n🌐 Test API: /search/autocomplete/cities?q=y');
    try {
      const response = await fetch(`${API_URL}/search/autocomplete/cities?q=y`);
      const data = await response.json();
      if (response.ok) {
        log.success(`API OK - Résultats: ${JSON.stringify(data)}`);
      } else {
        log.error(`API Error: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      log.error(`Impossible de contacter l'API: ${e.message}`);
    }
    
    // Test endpoint quartiers avec filtre ville
    if (cities.rows.length > 0) {
      const testCity = cities.rows[0].city;
      console.log(`\n🌐 Test API: /search/autocomplete/neighborhoods?q=&city=${encodeURIComponent(testCity)}`);
      try {
        const response = await fetch(`${API_URL}/search/autocomplete/neighborhoods?q=&city=${encodeURIComponent(testCity)}`);
        const data = await response.json();
        if (response.ok) {
          log.success(`API OK - Quartiers de ${testCity}: ${JSON.stringify(data)}`);
        } else {
          log.error(`API Error: ${JSON.stringify(data)}`);
        }
      } catch (e) {
        log.error(`Impossible de contacter l'API: ${e.message}`);
      }
    }

    // 4. Résumé
    log.title('RÉSUMÉ');
    
    const totalCountries = countries.rows.length;
    const totalCities = cities.rows.length;
    const totalNeighborhoods = neighborhoods.rows.length;
    
    console.log(`📊 Données disponibles pour l'autocomplétion:`);
    console.log(`   - ${totalCountries} pays unique(s)`);
    console.log(`   - ${totalCities} ville(s) unique(s)`);
    console.log(`   - ${totalNeighborhoods} quartier(s) unique(s)`);
    
    if (totalCountries === 0 && totalCities === 0 && totalNeighborhoods === 0) {
      log.warn('\n⚠️  La base de données est vide!');
      log.info('Créez des comptes utilisateurs ou des produits avec des localisations pour tester l\'autocomplétion.');
    } else {
      log.success('\n✅ L\'autocomplétion devrait fonctionner correctement!');
    }

  } catch (error) {
    log.error(`Erreur: ${error.message}`);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Fonction pour ajouter des données de test
async function addTestData() {
  log.title('AJOUT DE DONNÉES DE TEST');
  
  try {
    // Vérifier si des données de test existent déjà
    const existing = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE email LIKE '%@test-autocomplete.com'
    `);
    
    if (parseInt(existing.rows[0].count) > 0) {
      log.info('Des données de test existent déjà. Suppression...');
      await pool.query(`DELETE FROM users WHERE email LIKE '%@test-autocomplete.com'`);
    }
    
    // Données de test
    const testLocations = [
      { country: 'Cameroun', city: 'Yaoundé', neighborhood: 'Bastos' },
      { country: 'Cameroun', city: 'Yaoundé', neighborhood: 'Nlongkak' },
      { country: 'Cameroun', city: 'Yaoundé', neighborhood: 'Mvan' },
      { country: 'Cameroun', city: 'Yaoundé', neighborhood: 'Biyem-Assi' },
      { country: 'Cameroun', city: 'Yaoundé', neighborhood: 'Essos' },
      { country: 'Cameroun', city: 'Douala', neighborhood: 'Akwa' },
      { country: 'Cameroun', city: 'Douala', neighborhood: 'Bonanjo' },
      { country: 'Cameroun', city: 'Douala', neighborhood: 'Deido' },
      { country: 'Cameroun', city: 'Douala', neighborhood: 'Bonapriso' },
      { country: 'France', city: 'Paris', neighborhood: 'Montmartre' },
      { country: 'France', city: 'Paris', neighborhood: 'Marais' },
      { country: 'France', city: 'Lyon', neighborhood: 'Presqu\'île' },
      { country: 'Côte d\'Ivoire', city: 'Abidjan', neighborhood: 'Cocody' },
      { country: 'Côte d\'Ivoire', city: 'Abidjan', neighborhood: 'Plateau' },
      { country: 'Sénégal', city: 'Dakar', neighborhood: 'Plateau' },
    ];
    
    log.info('Insertion des données de test...');
    
    for (let i = 0; i < testLocations.length; i++) {
      const loc = testLocations[i];
      await pool.query(`
        INSERT INTO users (
          email, password, first_name, last_name, user_type, 
          country, city, neighborhood, whatsapp_number
        ) VALUES (
          $1, $2, $3, $4, 'seller',
          $5, $6, $7, $8
        )
      `, [
        `test${i + 1}@test-autocomplete.com`,
        '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // hash bidon
        `Test${i + 1}`,
        `User${i + 1}`,
        loc.country,
        loc.city,
        loc.neighborhood,
        `+237600000${String(i).padStart(3, '0')}`
      ]);
    }
    
    log.success(`${testLocations.length} utilisateurs de test ajoutés!`);
    
    // Afficher les données ajoutées
    console.log('\n📍 Localisations ajoutées:');
    testLocations.forEach(loc => {
      console.log(`   - ${loc.country} > ${loc.city} > ${loc.neighborhood}`);
    });
    
  } catch (error) {
    log.error(`Erreur lors de l'ajout des données: ${error.message}`);
  }
}

// Fonction pour supprimer les données de test
async function removeTestData() {
  log.title('SUPPRESSION DES DONNÉES DE TEST');
  
  try {
    const result = await pool.query(`
      DELETE FROM users WHERE email LIKE '%@test-autocomplete.com'
      RETURNING id
    `);
    
    log.success(`${result.rowCount} utilisateurs de test supprimés`);
  } catch (error) {
    log.error(`Erreur: ${error.message}`);
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  switch (command) {
    case 'add':
      await addTestData();
      await testAutocomplete();
      break;
    case 'remove':
      await removeTestData();
      break;
    case 'test':
    default:
      await testAutocomplete();
      break;
  }
  
  await pool.end();
})();
