// Unified storage helpers that migrate any legacy "rezylo:*" keys into "citykul:*"
function migrateKey(key) {
  if (key.startsWith("citykul:")) return key;
  if (key.startsWith("rezylo:")) return key.replace(/^rezylo:/, "citykul:");
  return key;
}

export function loadJSON(key, fallback) {
  const newKey = migrateKey(key);
  try {
    // Prefer new key first
    const rawNew = localStorage.getItem(newKey);
    if (rawNew != null) return JSON.parse(rawNew);

    // Fallback to legacy key if present
    if (key !== newKey) {
      const rawOld = localStorage.getItem(key);
      if (rawOld != null) {
        // Save immediately to new namespace (migrate-on-read)
        localStorage.setItem(newKey, rawOld);
        return JSON.parse(rawOld);
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  const newKey = migrateKey(key);
  localStorage.setItem(newKey, JSON.stringify(value));
  // Optionally remove legacy key to avoid drift
  if (key !== newKey) localStorage.removeItem(key);
}
