import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
const hasCloudinaryKeys =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

// Prefer explicit keys when available (less error-prone than a copied URL)
if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  });
} else if (hasCloudinaryUrl) {
  const rawUrl = process.env.CLOUDINARY_URL.trim();
  // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const url = new URL(rawUrl.replace('cloudinary://', 'https://'));
  cloudinary.config({
    cloud_name: url.hostname.trim(),
    api_key: decodeURIComponent(url.username).trim(),
    api_secret: decodeURIComponent(url.password).trim(),
  });
} else {
  throw new Error('Cloudinary config missing. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.');
}

const cfg = cloudinary.config();
console.log('Cloudinary configured', {
  cloud_name: cfg.cloud_name,
  api_key_suffix: cfg.api_key ? cfg.api_key.slice(-4) : null,
  api_secret_suffix: cfg.api_secret ? cfg.api_secret.slice(-4) : null,
  api_secret_len: cfg.api_secret ? cfg.api_secret.length : 0,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'link/products',
      resource_type: 'auto',
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /\.(jpeg|jpg|png|gif|webp|avif)$/i;
  const allowedVideoTypes = /\.(mp4|webm|ogg|mov|avi|mkv|m4v)$/i;
  const extname = file.originalname.split('.').pop()?.toLowerCase() || '';
  const isImage = allowedImageTypes.test(`.${extname}`) || file.mimetype.startsWith('image/');
  const isVideo = allowedVideoTypes.test(`.${extname}`) || file.mimetype.startsWith('video/');

  if (isImage || isVideo) {
    return cb(null, true);
  }
  cb(new Error('Seules les images (jpeg, jpg, png, gif, webp, avif) et vidéos (mp4, webm, ogg, mov, avi, mkv, m4v) sont autorisées'));
};

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});
