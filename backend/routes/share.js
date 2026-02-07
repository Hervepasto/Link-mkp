import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPublicUrl = (req) => {
  const envUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.city, p.price, p.post_type,
              pi.image_url
       FROM products p
       LEFT JOIN LATERAL (
         SELECT image_url
         FROM product_images
         WHERE product_id = p.id
         ORDER BY image_order
         LIMIT 1
       ) pi ON true
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('<h1>Produit non trouvé</h1>');
    }

    const product = result.rows[0];
    const baseUrl = buildPublicUrl(req);
    const appUrl = `${baseUrl}/#/product/${product.id}`;
    const shareUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const title = product.name || 'Produit sur Link';
    const description = product.description
      ? product.description.slice(0, 160)
      : `Découvrez ce produit sur Link${product.city ? ` à ${product.city}` : ''}.`;

    const imageUrl = product.image_url && product.image_url.startsWith('http')
      ? product.image_url
      : '';

    const escapedTitle = escapeHtml(title);
    const escapedDescription = escapeHtml(description);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:url" content="${shareUrl}" />
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ''}
    <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ''}
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
  </head>
  <body>
    <p>Redirection vers le produit...</p>
    <a href="${appUrl}">Voir le produit</a>
  </body>
</html>`);
  } catch (error) {
    console.error('Share product error:', error);
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
});

export default router;
