import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Fonction pour normaliser le texte (enlever accents, apostrophes et mettre en minuscule)
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
    .replace(/[''`´]/g, "'") // Normalise les apostrophes
    .replace(/\s+/g, ' '); // Normalise les espaces multiples
};

// Seuil de similarité pour la recherche floue (0.3 = 30% de similarité minimum)
const SIMILARITY_THRESHOLD = 0.2;

// Recherche de vendeurs par produits vendus (mots-clés)
router.get('/sellers', async (req, res) => {
  try {
    const { keyword, country, city, neighborhood } = req.query;

    if (!keyword && !country && !city && !neighborhood) {
      return res.status(400).json({ error: 'Au moins un critère de recherche requis' });
    }

    let query = `
      SELECT 
        id,
        first_name,
        last_name,
        account_type,
        country,
        city,
        neighborhood,
        whatsapp_number,
        products_sold,
        created_at
      FROM users
      WHERE user_type = 'seller'
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Recherche par mots-clés dans products_sold (fuzzy search avec similarité)
    if (keyword && keyword.trim()) {
      const normalizedKeyword = normalizeText(keyword);
      // Recherche floue : 
      // 1. LIKE pour correspondance de sous-chaîne
      // 2. word_similarity pour correspondance floue mot par mot
      conditions.push(`(
        LOWER(COALESCE(products_sold, '')) LIKE $${paramIndex}
        OR word_similarity($${paramIndex + 1}, LOWER(COALESCE(products_sold, ''))) > ${SIMILARITY_THRESHOLD}
      )`);
      params.push(`%${normalizedKeyword}%`);
      params.push(normalizedKeyword);
      paramIndex += 2;
    }
    if (country && country.trim()) {
      const normalizedCountry = normalizeText(country);
      conditions.push(`LOWER(COALESCE(country, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedCountry}%`);
    }
    if (city && city.trim()) {
      const normalizedCity = normalizeText(city);
      conditions.push(`LOWER(COALESCE(city, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedCity}%`);
    }
    if (neighborhood && neighborhood.trim()) {
      const normalizedNeighborhood = normalizeText(neighborhood);
      conditions.push(`LOWER(COALESCE(neighborhood, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedNeighborhood}%`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Ordonner par pertinence (similarité) puis par date
    if (keyword && keyword.trim()) {
      const normalizedKeyword = normalizeText(keyword);
      query += ` ORDER BY word_similarity('${normalizedKeyword.replace(/'/g, "''")}', LOWER(COALESCE(products_sold, ''))) DESC, created_at DESC LIMIT 100`;
    } else {
      query += ' ORDER BY created_at DESC LIMIT 100';
    }

    const result = await pool.query(query, params);

    res.json({ sellers: result.rows });
  } catch (error) {
    console.error('Search sellers error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recherche de produits par localisation
router.get('/products', async (req, res) => {
  try {
    const { country, city, neighborhood, keyword } = req.query;

    let query = `
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.account_type as seller_account_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'order', pi.image_order
            ) ORDER BY pi.image_order
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (country && country.trim()) {
      const normalizedCountry = normalizeText(country);
      conditions.push(`LOWER(COALESCE(p.country, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedCountry}%`);
    }
    if (city && city.trim()) {
      const normalizedCity = normalizeText(city);
      conditions.push(`LOWER(COALESCE(p.city, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedCity}%`);
    }
    if (neighborhood && neighborhood.trim()) {
      const normalizedNeighborhood = normalizeText(neighborhood);
      conditions.push(`LOWER(COALESCE(p.neighborhood, '')) LIKE $${paramIndex++}`);
      params.push(`%${normalizedNeighborhood}%`);
    }
    if (keyword && keyword.trim()) {
      const normalizedKeyword = normalizeText(keyword);
      // Recherche floue : 
      // 1. LIKE pour correspondance de sous-chaîne
      // 2. word_similarity pour correspondance floue mot par mot
      conditions.push(`(
        LOWER(COALESCE(p.name, '')) LIKE $${paramIndex}
        OR LOWER(COALESCE(p.description, '')) LIKE $${paramIndex}
        OR word_similarity($${paramIndex + 1}, LOWER(COALESCE(p.name, ''))) > ${SIMILARITY_THRESHOLD}
        OR word_similarity($${paramIndex + 1}, LOWER(COALESCE(p.description, ''))) > ${SIMILARITY_THRESHOLD}
      )`);
      params.push(`%${normalizedKeyword}%`);
      params.push(normalizedKeyword);
      paramIndex += 2;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY p.id, u.first_name, u.last_name, u.account_type
    `;

    // Ordonner par pertinence (similarité) puis par date
    if (keyword && keyword.trim()) {
      const normalizedKeyword = normalizeText(keyword);
      query += ` ORDER BY GREATEST(
        word_similarity('${normalizedKeyword.replace(/'/g, "''")}', LOWER(COALESCE(p.name, ''))),
        word_similarity('${normalizedKeyword.replace(/'/g, "''")}', LOWER(COALESCE(p.description, '')))
      ) DESC, p.created_at DESC LIMIT 100`;
    } else {
      query += ' ORDER BY p.created_at DESC LIMIT 100';
    }

    const result = await pool.query(query, params);

    res.json({ products: result.rows });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Autocomplétion pour les pays
router.get('/autocomplete/countries', async (req, res) => {
  try {
    const { q } = req.query;
    const normalizedQuery = normalizeText(q || '');
    
    const result = await pool.query(`
      SELECT DISTINCT country as value
      FROM (
        SELECT country FROM users WHERE country IS NOT NULL AND country != ''
        UNION
        SELECT country FROM products WHERE country IS NOT NULL AND country != ''
      ) combined
      WHERE LOWER(country) LIKE $1
      ORDER BY country
      LIMIT 20
    `, [`${normalizedQuery}%`]);
    
    res.json(result.rows.map(r => r.value));
  } catch (error) {
    console.error('Autocomplete countries error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Autocomplétion pour les villes
router.get('/autocomplete/cities', async (req, res) => {
  try {
    const { q, country } = req.query;
    const normalizedQuery = normalizeText(q || '');
    
    let query = `
      SELECT DISTINCT city as value
      FROM (
        SELECT city, country FROM users WHERE city IS NOT NULL AND city != ''
        UNION
        SELECT city, country FROM products WHERE city IS NOT NULL AND city != ''
      ) combined
      WHERE LOWER(city) LIKE $1
    `;
    const params = [`${normalizedQuery}%`];
    
    // Filtrer par pays si spécifié
    if (country && country.trim()) {
      query += ` AND LOWER(country) = $2`;
      params.push(normalizeText(country));
    }
    
    query += ` ORDER BY city LIMIT 20`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows.map(r => r.value));
  } catch (error) {
    console.error('Autocomplete cities error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Autocomplétion pour les quartiers
router.get('/autocomplete/neighborhoods', async (req, res) => {
  try {
    const { q, city } = req.query;
    const normalizedQuery = normalizeText(q || '');
    
    let query = `
      SELECT DISTINCT neighborhood as value
      FROM (
        SELECT neighborhood, city FROM users WHERE neighborhood IS NOT NULL AND neighborhood != ''
        UNION
        SELECT neighborhood, city FROM products WHERE neighborhood IS NOT NULL AND neighborhood != ''
      ) combined
      WHERE LOWER(neighborhood) LIKE $1
    `;
    const params = [`${normalizedQuery}%`];
    
    // Filtrer par ville si spécifiée
    if (city && city.trim()) {
      query += ` AND LOWER(city) = $2`;
      params.push(normalizeText(city));
    }
    
    query += ` ORDER BY neighborhood LIMIT 20`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows.map(r => r.value));
  } catch (error) {
    console.error('Autocomplete neighborhoods error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
