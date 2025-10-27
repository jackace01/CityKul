// src/lib/api/users.js
// LocalStorage-backed public user directory + block/report helpers

const KEY_USERS = "citykul:users:directory";
const KEY_BLOCKS = "citykul:users:blocks";   // { "<myId>": ["otherA","otherB"] }
const KEY_REPORTS = "citykul:users:reports"; // array of {id, reporterId, targetId, reason, ts}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Seed a small demo directory if empty */
export function seedDirectoryIfEmpty() {
  const cur = load(KEY_USERS, []);
  if (Array.isArray(cur) && cur.length) return cur;

  const demo = [
    {
      id: "anita@city",
      name: "Anita",
      city: "Indore",
      locality: "Rajwada",
      occupation: "Designer",
      bio: "Community volunteer. Loves parks & photo walks.",
    },
    {
      id: "arif@city",
      name: "Arif",
      city: "Bhopal",
      locality: "TT Nagar",
      occupation: "Student",
      bio: "Transit nerd. Mapping bus routes for fun.",
    },
    {
      id: "meera@city",
      name: "Meera",
      city: "Pune",
      locality: "Kothrud",
      occupation: "Home chef",
      bio: "Selling seasonal pickles and sweets to neighbors.",
    },
    {
      id: "karan@city",
      name: "Karan",
      city: "Delhi",
      locality: "Lajpat",
      occupation: "Ops @ startup",
      bio: "Weekend football + local cleanups.",
    },
  ];
  save(KEY_USERS, demo);
  return demo;
}

/** Create or update a public profile record (id is required) */
export function upsertPublicUser(profile) {
  if (!profile || !profile.id) return null;
  const list = load(KEY_USERS, []);
  const idx = list.findIndex((p) => p.id === profile.id);
  const clean = {
    id: String(profile.id),
    name: String(profile.name || "").trim(),
    city: String(profile.city || ""),
    locality: String(profile.locality || ""),
    occupation: String(profile.occupation || ""),
    bio: String(profile.bio || ""),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...clean };
  else list.unshift(clean);
  save(KEY_USERS, list);
  return clean;
}

/** Fetch a single profile by id */
export function getProfile(id) {
  const list = load(KEY_USERS, []);
  return list.find((p) => p.id === id) || null;
}

/** List people, optionally filtered */
export function listPeople({ city = "", q = "" } = {}) {
  const list = load(KEY_USERS, []);
  const byCity = city ? list.filter((p) => (p.city || "").toLowerCase() === city.toLowerCase()) : list;
  const query = (q || "").trim().toLowerCase();
  if (!query) return byCity;
  return byCity.filter((p) =>
    [p.name, p.occupation, p.locality].some((v) => String(v || "").toLowerCase().includes(query))
  );
}

/* ----------------- Block / Unblock ----------------- */
function loadBlocks() {
  return load(KEY_BLOCKS, {});
}
function saveBlocks(db) {
  save(KEY_BLOCKS, db);
}

export function isBlocked(myId, otherId) {
  const db = loadBlocks();
  return Array.isArray(db[myId]) ? db[myId].includes(otherId) : false;
}

export function blockUser(myId, otherId) {
  const db = loadBlocks();
  const set = new Set(db[myId] || []);
  set.add(otherId);
  db[myId] = Array.from(set);
  saveBlocks(db);
  return true;
}

export function unblockUser(myId, otherId) {
  const db = loadBlocks();
  db[myId] = (db[myId] || []).filter((x) => x !== otherId);
  saveBlocks(db);
  return true;
}

/* ----------------- Report ----------------- */
export function reportUser(reporterId, targetId, reason = "Other") {
  const list = load(KEY_REPORTS, []);
  list.unshift({
    id: `r-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    reporterId,
    targetId,
    reason: String(reason || "Other"),
    ts: Date.now(),
  });
  save(KEY_REPORTS, list);
  return true;
}
