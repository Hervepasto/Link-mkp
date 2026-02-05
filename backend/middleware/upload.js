import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
const hasCloudinaryKeys =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryUrl) {
  // The SDK parses the URL and picks up the secret correctly when passed as a string.
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

if (!hasCloudinaryUrl && !hasCloudinaryKeys) {
  throw new Error('Cloudinary config missing. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.');
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype?.startsWith('video/');
    return {
      folder: 'link/products',
      resource_type: 'auto',
      allowed_formats: isVideo
        ? ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v']
        : ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'],
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
