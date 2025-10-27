// Simple blocklist storage: { "<myUserId>": ["blockedA","blockedB"] }
const KEY = "citykul:blocks";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function listBlocked(myId) {
  const db = load();
  return db[myId] || [];
}

export function isBlocked(myId, otherId) {
  const db = load();
  return (db[myId] || []).includes(otherId);
}

export function blockUser(myId, otherId) {
  const db = load();
  const set = new Set(db[myId] || []);
  set.add(otherId);
  db[myId] = Array.from(set);
  save(db);
}

export function unblockUser(myId, otherId) {
  const db = load();
  db[myId] = (db[myId] || []).filter(x => x !== otherId);
  save(db);
}
