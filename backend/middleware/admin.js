const normalizePhone = (value = '') => value.replace(/\D/g, '');

const parseList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifiÃ©' });
  }

  const adminIds = parseList(process.env.ADMIN_USER_IDS || '');
  const adminPhones = parseList(process.env.ADMIN_WHATSAPP || '').map(normalizePhone);

  const userId = req.user.id;
  const userPhone = normalizePhone(req.user.whatsapp_number || '');

  const isAdmin =
    (adminIds.length > 0 && adminIds.includes(userId)) ||
    (adminPhones.length > 0 && userPhone && adminPhones.includes(userPhone));

  if (!isAdmin) {
    return res.status(403).json({ error: 'AccÃ¨s rÃ©servÃ© Ã  lâ€™administrateur' });
  }

  next();
};
