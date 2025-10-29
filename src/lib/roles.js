// src/lib/roles.js
// Lightweight role + badge system backed by localStorage.
// Targets:
//   - Users:      targetType = "user",    targetId = userId (email/name string)
//   - Discover:   targetType = "discover",targetId = placeId
//   - Rental:     targetType = "rental",  targetId = listingId
//
// Supported roles (extend freely):
//   - "verified_business"  → ✅ Verified Business
//   - "official"           → 🏛️ Official
//   - "trusted_reviewer"   → ⭐ Trusted Reviewer
//
// Storage key: citykul:roles:<targetType>:<targetId>  -> ["roleA","roleB",...]

const KEY = (type, id) => `citykul:roles:${type}:${id}`;

function load(type, id) {
  try {
    const raw = localStorage.getItem(KEY(type, id));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function save(type, id, arr) {
  localStorage.setItem(KEY(type, id), JSON.stringify(Array.from(new Set(arr || []))));
}

export function listUserRoles(userId = "") {
  if (!userId) return [];
  return load("user", String(userId));
}
export function grantRole(targetType, targetId, role) {
  if (!targetType || !targetId || !role) return;
  const arr = load(targetType, targetId);
  if (!arr.includes(role)) {
    arr.push(role);
    save(targetType, targetId, arr);
  }
}
export function revokeRole(targetType, targetId, role) {
  const arr = load(targetType, targetId).filter(r => r !== role);
  save(targetType, targetId, arr);
}
export function hasRole(targetType, targetId, role) {
  return load(targetType, targetId).includes(role);
}
export function listRoles(targetType, targetId) {
  return load(targetType, targetId);
}

// ---- Badges mapping ----
function roleToBadge(role) {
  switch (role) {
    case "verified_business": return "✅ Verified";
    case "official":          return "🏛️ Official";
    case "trusted_reviewer":  return "⭐ Trusted Reviewer";
    default: return null;
  }
}

// For entities (discover place / rental listing).
// We check roles attached to the entity itself first.
// Optionally also reflect owner roles (e.g., verified business at owner level) if useful.
export function getEntityBadges(itemType, item) {
  if (!item) return [];
  const id = item.id || "";
  const ownerId = item.ownerId || "";
  const entityRoles = listRoles(itemType, id);
  const out = entityRoles.map(roleToBadge).filter(Boolean);

  // Optionally bubble up owner roles (comment out if not desired):
  // e.g., if the owner has "verified_business", reflect on the listing/place as well.
  if (ownerId) {
    const ownerRoles = listRoles("user", ownerId);
    for (const r of ownerRoles) {
      const b = roleToBadge(r);
      if (b && !out.includes(b)) out.push(b);
    }
  }
  return out;
}

// For users showing next to their names (review authors, owners, officials).
export function getUserBadges(userId) {
  if (!userId) return [];
  return listUserRoles(userId).map(roleToBadge).filter(Boolean);
}
