import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const requiredEnv = ['DATABASE_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env ${key}`);
    process.exit(1);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const uploadFile = async (filePath) => {
  const res = await cloudinary.uploader.upload(filePath, {
    folder: 'link/products',
    resource_type: 'auto',
  });
  return res.secure_url || res.url;
};

const normalizeFilename = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('/uploads/')) {
    return path.basename(imageUrl);
  }
  if (!imageUrl.startsWith('http')) {
    return imageUrl.startsWith('/') ? path.basename(imageUrl) : imageUrl;
  }
  return null;
};

const migrateTable = async (client, table, column) => {
  const rows = await client.query(
    `SELECT id, ${column} AS image_url FROM ${table} WHERE ${column} IS NOT NULL AND ${column} NOT LIKE 'http%'`
  );

  let updated = 0;
  let missing = 0;

  for (const row of rows.rows) {
    const filename = normalizeFilename(row.image_url);
    if (!filename) continue;

    const localPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`Missing file: ${localPath}`);
      missing++;
      continue;
    }

    try {
      const url = await uploadFile(localPath);
      await client.query(
        `UPDATE ${table} SET ${column} = $1 WHERE id = $2`,
        [url, row.id]
      );
      updated++;
      console.log(`Updated ${table}.${column} for ${row.id}`);
    } catch (err) {
      console.error(`Upload failed for ${localPath}:`, err.message);
    }
  }

  console.log(`${table}.${column} updated: ${updated}, missing: ${missing}`);
};

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting migration from local uploads to Cloudinary...');
    await migrateTable(client, 'product_images', 'image_url');
    await migrateTable(client, 'products', 'image_url');
    console.log('Migration finished.');
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
