import { v2 as cloudinary } from 'cloudinary';

const hasCloudinaryKeys =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;

if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  });
} else if (hasCloudinaryUrl) {
  const rawUrl = process.env.CLOUDINARY_URL.trim();
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

export default cloudinary;
