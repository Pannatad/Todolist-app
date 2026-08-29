const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export const normalizeLinkUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    return HTTP_PROTOCOLS.has(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};

export const getLinkHostname = (value) => {
  const normalized = normalizeLinkUrl(value);
  if (!normalized) return '';

  try {
    return new URL(normalized).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
};

export const getLinkDraftError = ({ title, url } = {}) => {
  if (!String(title || '').trim()) return 'Add a name for this link.';
  if (!normalizeLinkUrl(url)) return 'Enter a valid website URL.';
  return '';
};

export const normalizeLinkRecord = (record = {}) => ({
  id: record.id,
  title: String(record.title || record.name || '').trim(),
  url: normalizeLinkUrl(record.url),
  category: String(record.category || '').trim(),
  description: String(record.description || record.notes || '').trim(),
  created_at: record.created_at || record.createdAt || null,
  updated_at: record.updated_at || record.updatedAt || null,
});
