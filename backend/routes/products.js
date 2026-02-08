import express from 'express';
import { authenticate, requireSeller } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'link/products', resource_type: 'auto' },
    (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }
  );
  stream.end(file.buffer);
});

const buildShareBase = (req) => {
  const envUrl = process.env.SHARE_BASE_URL || process.env.BACKEND_URL || process.env.API_PUBLIC_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
  return `${proto}://${req.get('host')}`;
};


// Obtenir tous les produits (fil d'actualité)
router.get('/', async (req, res) => {
  try {
    const { country, city, neighborhood, limit = 50, offset = 0, seller } = req.query;
    const userId = req.headers.authorization ? 
      (await import('jsonwebtoken')).default.verify(
        req.headers.authorization.split(' ')[1],
        process.env.JWT_SECRET
      ).userId : null;

    let query = `
      SELECT 
        p.*,
        p.seller_id,
        u.first_name || ' ' || u.last_name as seller_name,
        u.account_type as seller_account_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'order', pi.image_order,
              'media_type', pi.media_type
            ) ORDER BY pi.image_order
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as images,
        EXISTS(
          SELECT 1 FROM product_interests pi2 
          WHERE pi2.product_id = p.id AND pi2.user_id = $1
        ) as is_interested
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
    `;

    const queryParams = [userId];
    const conditions = [];

    // Si on filtre par vendeur, ne montrer que les produits où seller_id = seller
    // (cela inclut les produits originaux ET les repartages de cet utilisateur)
    if (seller) {
      queryParams.push(seller);
      conditions.push(`p.seller_id = $${queryParams.length}`);
    }

    if (country) {
      queryParams.push(country);
      conditions.push(`p.country = $${queryParams.length}`);
    }
    if (city) {
      queryParams.push(city);
      conditions.push(`p.city = $${queryParams.length}`);
    }
    if (neighborhood) {
      queryParams.push(neighborhood);
      conditions.push(`p.neighborhood = $${queryParams.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Obtenir la localisation de l'utilisateur pour la priorisation
    let userLocation = null;
    if (userId) {
      const userLocResult = await pool.query(
        'SELECT country, city, neighborhood FROM users WHERE id = $1',
        [userId]
      );
      if (userLocResult.rows.length > 0) {
        userLocation = userLocResult.rows[0];
      }
    }

    query += ` GROUP BY p.id, p.seller_id, u.first_name, u.last_name, u.account_type `;
    
    // Priorisation géographique si l'utilisateur est connecté
    if (userLocation) {
      query += ` ORDER BY 
        CASE 
          WHEN p.country = $${queryParams.length + 1} AND p.city = $${queryParams.length + 2} AND p.neighborhood = $${queryParams.length + 3} THEN 1
          WHEN p.country = $${queryParams.length + 1} AND p.city = $${queryParams.length + 2} THEN 2
          WHEN p.country = $${queryParams.length + 1} THEN 3
          ELSE 4
        END,
        p.created_at DESC `;
      queryParams.push(userLocation.country, userLocation.city, userLocation.neighborhood);
    } else {
      query += ` ORDER BY p.created_at DESC `;
    }

    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2} `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    res.json({ products: result.rows });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un produit par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers.authorization ? 
      (await import('jsonwebtoken')).default.verify(
        req.headers.authorization.split(' ')[1],
        process.env.JWT_SECRET
      ).userId : null;

    // Enregistrer la vue
    const ipAddress = req.ip || req.connection.remoteAddress;
    await pool.query(
      `INSERT INTO product_views (product_id, user_id, ip_address)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, user_id, ip_address) DO NOTHING`,
      [id, userId, ipAddress]
    );

    const result = await pool.query(
      `SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as seller_name,
        u.account_type as seller_account_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'order', pi.image_order,
              'media_type', pi.media_type
            ) ORDER BY pi.image_order
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as images,
        EXISTS(
          SELECT 1 FROM product_interests pi2 
          WHERE pi2.product_id = p.id AND pi2.user_id = $2
        ) as is_interested
       FROM products p
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN product_images pi ON p.id = pi.product_id
       WHERE p.id = $1
       GROUP BY p.id, u.first_name, u.last_name, u.account_type`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un post (produit, annonce ou besoin)
router.post('/', authenticate, requireSeller, upload.array('images', 10), [
  body('name').trim().notEmpty(),
  body('description').optional(),
  body('country').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('neighborhood').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      description, 
      country, 
      city, 
      neighborhood, 
      whatsappNumber,
      postType = 'product',  // product, announcement, need
      price,
      isUrgent = false,
      category
    } = req.body;
    const files = req.files || [];

    // Validation selon le type de post
    if (postType === 'product' && files.length === 0) {
      return res.status(400).json({ error: 'Au moins une image est requise pour un produit' });
    }

    // Obtenir le numéro WhatsApp du vendeur si non fourni
    const userResult = await pool.query(
      'SELECT whatsapp_number FROM users WHERE id = $1',
      [req.user.id]
    );
    const sellerWhatsApp = whatsappNumber || userResult.rows[0]?.whatsapp_number;

    if (!sellerWhatsApp) {
      return res.status(400).json({ error: 'Numéro WhatsApp requis' });
    }

    // Créer le post
    const productResult = await pool.query(
      `INSERT INTO products (
        seller_id, name, description, country, city, neighborhood, 
        whatsapp_number, post_type, price, is_urgent, category
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id, 
        name, 
        description || null, 
        country, 
        city, 
        neighborhood, 
        sellerWhatsApp,
        postType,
        postType === 'product' ? (price || null) : null,
        postType === 'need' ? (isUrgent === 'true' || isUrgent === true) : false,
        postType === 'need' ? category : null
      ]
    );

    const product = productResult.rows[0];

    // Enregistrer les images et vidéos (sauf pour les besoins)
    if (files.length > 0 && postType !== 'need') {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const result = await uploadToCloudinary(file);
        const mediaUrl = result.secure_url || result.url;
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

        await pool.query(
          `INSERT INTO product_images (product_id, image_url, image_order, media_type)
           VALUES ($1, $2, $3, $4)`,
          [product.id, mediaUrl, index, mediaType]
        );
      }
    }

    const postTypeLabels = {
      'product': 'Produit',
      'announcement': 'Annonce',
      'need': 'Besoin'
    };

    res.status(201).json({ 
      message: `${postTypeLabels[postType]} créé avec succès`,
      product 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Mettre à jour un post (vendeur propriétaire uniquement)
router.put('/:id', authenticate, requireSeller, upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, country, city, neighborhood, whatsappNumber, price, isUrgent, category, removedMedia } = req.body;
    const files = req.files || [];

    // Vérifier que le produit appartient au vendeur
    const productCheck = await pool.query(
      'SELECT seller_id, post_type FROM products WHERE id = $1',
      [id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post non trouvé' });
    }

    if (productCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const postType = productCheck.rows[0].post_type;

    // Mettre à jour le post
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }
    if (country) {
      updateFields.push(`country = $${paramIndex++}`);
      updateValues.push(country);
    }
    if (city) {
      updateFields.push(`city = $${paramIndex++}`);
      updateValues.push(city);
    }
    if (neighborhood) {
      updateFields.push(`neighborhood = $${paramIndex++}`);
      updateValues.push(neighborhood);
    }
    if (whatsappNumber) {
      updateFields.push(`whatsapp_number = $${paramIndex++}`);
      updateValues.push(whatsappNumber);
    }
    if (price !== undefined && postType === 'product') {
      updateFields.push(`price = $${paramIndex++}`);
      updateValues.push(price || null);
    }
    if (isUrgent !== undefined && postType === 'need') {
      updateFields.push(`is_urgent = $${paramIndex++}`);
      updateValues.push(isUrgent === 'true' || isUrgent === true);
    }
    if (category !== undefined && postType === 'need') {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(category);
    }

    // Toujours mettre à jour updated_at
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await pool.query(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // Supprimer les médias existants si demandés
    if (removedMedia) {
      let ids = [];
      try {
        ids = JSON.parse(removedMedia);
      } catch (e) {
        ids = [];
      }
      if (Array.isArray(ids) && ids.length > 0) {
        await pool.query(
          `DELETE FROM product_images WHERE product_id = $1 AND id = ANY($2::uuid[])`,
          [id, ids]
        );
      }
    }

    // Ajouter les nouvelles images et vidéos (sauf pour les besoins)
    if (files.length > 0 && postType !== 'need') {
      // Obtenir le dernier ordre existant
      const lastOrderResult = await pool.query(
        'SELECT COALESCE(MAX(image_order), -1) as last_order FROM product_images WHERE product_id = $1',
        [id]
      );
      let startOrder = (lastOrderResult.rows[0]?.last_order || -1) + 1;

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const result = await uploadToCloudinary(file);
        const mediaUrl = result.secure_url || result.url;
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

        await pool.query(
          `INSERT INTO product_images (product_id, image_url, image_order, media_type)
           VALUES ($1, $2, $3, $4)`,
          [id, mediaUrl, startOrder + index, mediaType]
        );
      }
    }

    res.json({ message: 'Post mis à jour avec succès' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Supprimer un produit (propriétaire uniquement - vendeur ou personne qui a republié)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const productCheck = await pool.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire (seller_id)
    // Cela fonctionne pour les produits originaux ET les repartages
    if (productCheck.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Supprimer le produit (les contraintes CASCADE supprimeront automatiquement
    // les images, vues, intérêts, commentaires et entrées dans product_reposts)
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Enregistrer une vue (appelé depuis le carrousel)
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer l'utilisateur si connecté
    let userId = null;
    if (req.headers.authorization) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const decoded = jwt.verify(
          req.headers.authorization.split(' ')[1],
          process.env.JWT_SECRET
        );
        userId = decoded.userId;
      } catch (e) {
        // Token invalide, continuer sans userId
      }
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Insérer la vue (ignore si déjà existante grâce à ON CONFLICT)
    const result = await pool.query(
      `INSERT INTO product_views (product_id, user_id, ip_address)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, user_id, ip_address) DO NOTHING
       RETURNING id`,
      [id, userId, userId ? null : ipAddress]
    );

    // Vérifier si une nouvelle vue a été ajoutée
    const isNewView = result.rows.length > 0;

    // Obtenir le nouveau compteur de vues
    const viewsResult = await pool.query(
      'SELECT views_count FROM products WHERE id = $1',
      [id]
    );

    res.json({ 
      success: true,
      isNewView,
      viewsCount: viewsResult.rows[0]?.views_count || 0
    });
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la vue' });
  }
});

// Marquer comme intéressé
router.post('/:id/interested', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Enregistrer la vue quand on clique sur intéressé
    const ipAddress = req.ip || req.connection.remoteAddress;
    await pool.query(
      `INSERT INTO product_views (product_id, user_id, ip_address)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, user_id, ip_address) DO NOTHING`,
      [id, req.user.id, ipAddress]
    );

    // Vérifier si l'utilisateur a déjà cliqué
    const existingInterest = await pool.query(
      'SELECT id FROM product_interests WHERE product_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    // Insérer seulement si l'utilisateur n'a pas déjà cliqué
    // Sécuriser contre les clics multiples simultanés
    if (existingInterest.rows.length === 0) {
      await pool.query(
        `INSERT INTO product_interests (product_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, user_id) DO NOTHING`,
        [id, req.user.id]
      );
    }

    // Obtenir le produit pour envoyer le message WhatsApp
    // IMPORTANT: Si c'est un repartage, on utilise TOUJOURS le vendeur original (celui qui a créé le produit)
    const productResult = await pool.query(
      `SELECT 
        p.name, 
        p.whatsapp_number,
        p.original_product_id,
        p.seller_id,
        p.post_type
      FROM products p
      WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    let product = productResult.rows[0];
    let postType = product.post_type;
    // Si c'est un repartage (original_product_id n'est pas NULL), 
    // récupérer les infos du produit original (vendeur original)
    if (product.original_product_id) {
      const originalProductResult = await pool.query(
        'SELECT name, whatsapp_number, post_type FROM products WHERE id = $1',
        [product.original_product_id]
      );
      if (originalProductResult.rows.length > 0) {
        // Utiliser le WhatsApp du vendeur original, pas celui qui a republié
        product = originalProductResult.rows[0];
        postType = product.post_type;
      }
    }

    let whatsappMessage = '';
    const shareBase = buildShareBase(req);
    const shareUrl = `${shareBase}/share/product/${id}`;
    if (postType === 'need') {
      whatsappMessage = `Bonjour, je peux vous aider pour votre besoin : "${product.name}" publie sur Link`;
    } else if (postType === 'announcement') {
      whatsappMessage = `Bonjour, je suis interesse par votre annonce "${product.name}" et aimerais en savoir davantage.`;
    } else {
      whatsappMessage = `Bonjour, je suis interesse par votre produit "${product.name}" publie sur Link.`;
    }
    const whatsappText = `${whatsappMessage}\nLien du produit : ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${product.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`;

    // Obtenir les compteurs mis à jour
    const countsResult = await pool.query(
      'SELECT views_count, interested_count FROM products WHERE id = $1',
      [id]
    );

    res.json({ 
      message: existingInterest.rows.length > 0 ? 'Déjà intéressé' : 'Intérêt enregistré',
      whatsappUrl,
      viewsCount: countsResult.rows[0]?.views_count || 0,
      interestedCount: countsResult.rows[0]?.interested_count || 0
    });
  } catch (error) {
    console.error('Interest error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer l'intérêt
router.delete('/:id/interested', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM product_interests WHERE product_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Intérêt retiré' });
  } catch (error) {
    console.error('Remove interest error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Republier un produit
router.post('/:id/repost', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Récupérer le produit original (ou le produit original si c'est déjà un repartage)
    const originalProductResult = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.country,
        p.city,
        p.neighborhood,
        p.whatsapp_number,
        p.price,
        COALESCE(p.original_product_id, p.id) as original_product_id,
        p.seller_id
      FROM products p
      WHERE p.id = $1`,
      [id]
    );

    if (originalProductResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const originalProduct = originalProductResult.rows[0];
    const originalProductId = originalProduct.original_product_id || originalProduct.id;

    // Vérifier si l'utilisateur a déjà republié ce produit
    const existingRepost = await pool.query(
      `SELECT id FROM product_reposts 
       WHERE original_product_id = $1 AND reposted_by_user_id = $2`,
      [originalProductId, userId]
    );

    if (existingRepost.rows.length > 0) {
      return res.status(400).json({ error: 'Vous avez déjà republié ce produit' });
    }

    // Vérifier que l'utilisateur ne republie pas son propre produit
    if (originalProduct.seller_id === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas republier votre propre produit' });
    }

    // Obtenir les informations de l'utilisateur qui republie
    const userResult = await pool.query(
      'SELECT country, city, neighborhood, whatsapp_number FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Créer un nouveau produit (repartage) avec les informations de l'utilisateur qui republie
    const repostedProductResult = await pool.query(
      `INSERT INTO products (
        seller_id, 
        name, 
        description, 
        country, 
        city, 
        neighborhood, 
        whatsapp_number,
        price,
        original_product_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        userId,
        originalProduct.name,
        originalProduct.description,
        user.country || originalProduct.country,
        user.city || originalProduct.city,
        user.neighborhood || originalProduct.neighborhood,
        user.whatsapp_number,
        originalProduct.price,
        originalProductId
      ]
    );

    const repostedProduct = repostedProductResult.rows[0];

    // Copier les images et vidéos du produit original
    const imagesResult = await pool.query(
      'SELECT image_url, image_order, media_type FROM product_images WHERE product_id = $1 ORDER BY image_order',
      [originalProductId]
    );

    if (imagesResult.rows.length > 0) {
      for (const img of imagesResult.rows) {
        await pool.query(
          `INSERT INTO product_images (product_id, image_url, image_order, media_type)
           VALUES ($1, $2, $3, $4)`,
          [repostedProduct.id, img.image_url, img.image_order, img.media_type || 'image']
        );
      }
    }

    // Enregistrer le repartage dans la table product_reposts
    await pool.query(
      `INSERT INTO product_reposts (original_product_id, reposted_by_user_id, reposted_product_id)
       VALUES ($1, $2, $3)`,
      [originalProductId, userId, repostedProduct.id]
    );

    res.status(201).json({ 
      message: 'Produit republié avec succès',
      product: repostedProduct
    });
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

