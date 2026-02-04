const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl && rawApiUrl.trim()
  ? rawApiUrl.trim()
  : `${window.location.origin}/api`;

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
const fileUrl = (path = '') => {
  if (!path) return '';
  return joinUrl(FILES_URL, path);
};

export { API_URL, FILES_URL, apiUrl, fileUrl };
