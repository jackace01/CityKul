// src/lib/notifications.js
// Tiny local notification center for CityKul.

const KEY = (userId) => `citykul:notifs:${userId || "guest@demo"}`;

function loadJSON(k, f = []) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
}
function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

/** notify(userId, { title, body, href? }) */
export function notify(userId, { title = "", body = "", href = "" }) {
  const row = {
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    title: String(title || "").slice(0, 140),
    body: String(body || "").slice(0, 500),
    href: String(href || ""),
    read: false,
  };
  const list = loadJSON(KEY(userId), []);
  list.unshift(row);
  // cap at 300 per user
  saveJSON(KEY(userId), list.slice(0, 300));
  return row;
}

export function listNotifs(userId) {
  return loadJSON(KEY(userId), []).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

export function markRead(userId, notifId) {
  const list = loadJSON(KEY(userId), []);
  const i = list.findIndex(n => n.id === notifId);
  if (i >= 0) list[i] = { ...list[i], read: true };
  saveJSON(KEY(userId), list);
}

export function clearAll(userId) {
  saveJSON(KEY(userId), []);
}
