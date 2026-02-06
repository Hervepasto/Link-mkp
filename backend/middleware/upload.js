import multer from 'multer';

const storage = multer.memoryStorage();

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
