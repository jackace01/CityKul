// Enhanced Follow/Friend + Block + Report system (localStorage)

const KEY_FRIENDS = "rezylo:friends";   // { "<myId>": ["userA","userB"] }
const KEY_BLOCKS  = "rezylo:blocks";    // { "<myId>": ["userC"] }
const KEY_REPORTS = "rezylo:reports";   // [ { id, from, about, reason, ts } ]

function load(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; }
}
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- Friends (follow) ---------- */
export function listFriends(myId) {
  const db = load(KEY_FRIENDS, {});
  return db[myId] || [];
}

export function isFriend(myId, otherId) {
  const db = load(KEY_FRIENDS, {});
  return (db[myId] || []).includes(otherId);
}

export function followUser(myId, otherId) {
  if (!myId || !otherId || myId === otherId) return;
  const db = load(KEY_FRIENDS, {});
  const set = new Set(db[myId] || []);
  set.add(otherId);
  db[myId] = Array.from(set);
  save(KEY_FRIENDS, db);
}

export function unfollowUser(myId, otherId) {
  if (!myId || !otherId) return;
  const db = load(KEY_FRIENDS, {});
  db[myId] = (db[myId] || []).filter((x) => x !== otherId);
  save(KEY_FRIENDS, db);
}

/* ---------- Blocks ---------- */
export function listBlocked(myId) {
  const db = load(KEY_BLOCKS, {});
  return db[myId] || [];
}

export function isBlocked(myId, otherId) {
  const db = load(KEY_BLOCKS, {});
  return (db[myId] || []).includes(otherId);
}

export function blockUser(myId, otherId) {
  if (!myId || !otherId || myId === otherId) return;
  const blocks = load(KEY_BLOCKS, {});
  const set = new Set(blocks[myId] || []);
  set.add(otherId);
  blocks[myId] = Array.from(set);
  save(KEY_BLOCKS, blocks);

  // Also auto-unfollow if blocked
  const friends = load(KEY_FRIENDS, {});
  friends[myId] = (friends[myId] || []).filter((x) => x !== otherId);
  save(KEY_FRIENDS, friends);
}

export function unblockUser(myId, otherId) {
  if (!myId || !otherId) return;
  const blocks = load(KEY_BLOCKS, {});
  blocks[myId] = (blocks[myId] || []).filter((x) => x !== otherId);
  save(KEY_BLOCKS, blocks);
}

/* ---------- Reports ---------- */
export function reportUser(fromId, aboutId, reason = "Inappropriate") {
  const arr = load(KEY_REPORTS, []);
  arr.unshift({
    id: `r-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    from: fromId || "guest@demo",
    about: aboutId,
    reason: String(reason || "Inappropriate"),
    ts: Date.now(),
  });
  save(KEY_REPORTS, arr);
  return true;
}

export function listReports() {
  return load(KEY_REPORTS, []);
}
