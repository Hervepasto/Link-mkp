const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl && rawApiUrl.trim()
  ? rawApiUrl.trim()
  : `${window.location.origin}/api`;

const rawPublicUrl = import.meta.env.VITE_PUBLIC_URL;
const PUBLIC_URL = rawPublicUrl && rawPublicUrl.trim()
  ? rawPublicUrl.trim()
  : window.location.origin;

const rawFilesUrl = import.meta.env.VITE_FILES_URL;
const FILES_URL = rawFilesUrl && rawFilesUrl.trim()
  ? rawFilesUrl.trim()
  : API_URL.replace(/\/api\/?$/, '');

const joinUrl = (base, path = '') => {
  const normalizedBase = base.replace(/\/$/, '');
  if (!path) return normalizedBase;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${normalizedBase}${path.startsWith('/') ? '' : '/'}${path}`;
};

const apiUrl = (path = '') => joinUrl(API_URL, path);
const optimizeCloudinaryUrl = (url, opts = {}) => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const width = opts.width || 800;
  const quality = opts.quality || 'auto';
  const format = opts.format || 'auto';
  // insert transformation after /upload/
  return url.replace('/upload/', `/upload/f_${format},q_${quality},w_${width}/`);
};

const fileUrl = (path = '', opts = {}) => {
  if (!path) return '';
  const full = joinUrl(FILES_URL, path);
  return optimizeCloudinaryUrl(full, opts);
};

export { API_URL, FILES_URL, PUBLIC_URL, apiUrl, fileUrl };
