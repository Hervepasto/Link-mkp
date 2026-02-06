const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

const units = [
  { name: 'year', seconds: 60 * 60 * 24 * 365 },
  { name: 'month', seconds: 60 * 60 * 24 * 30 },
  { name: 'week', seconds: 60 * 60 * 24 * 7 },
  { name: 'day', seconds: 60 * 60 * 24 },
  { name: 'hour', seconds: 60 * 60 },
  { name: 'minute', seconds: 60 },
  { name: 'second', seconds: 1 },
];

export const timeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  for (const unit of units) {
    if (abs >= unit.seconds || unit.name === 'second') {
      const value = Math.round(diffSeconds / unit.seconds);
      return rtf.format(value, unit.name);
    }
  }
  return '';
};
