// src/lib/config/loader.js
// Merges file defaults + localStorage overrides (per-city).
// Use getEffectiveConfig(city) everywhere you need runtime knobs.

import { DEFAULT_ECONOMY } from "./economy";

const KEY_PREFIX = "citykul:config:overrides:"; // + <city>

function key(city = "") {
  const c = (city || "").trim() || "default";
  return `${KEY_PREFIX}${c}`;
}

function isPlainObject(o) {
  return o && typeof o === "object" && !Array.isArray(o);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) return patch;
  const out = { ...base };
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function getOverride(city) {
  try {
    const raw = localStorage.getItem(key(city));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOverride(city, obj) {
  try {
    const cleaned = isPlainObject(obj) ? obj : {};
    localStorage.setItem(key(city), JSON.stringify(cleaned));
    localStorage.setItem(`${key(city)}:savedAt`, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function patchOverride(city, patch) {
  const cur = getOverride(city) || {};
  const next = deepMerge(cur, patch || {});
  return saveOverride(city, next);
}

export function resetOverride(city) {
  try {
    localStorage.removeItem(key(city));
    localStorage.removeItem(`${key(city)}:savedAt`);
  } catch {}
}

export function getOverrideSavedAt(city) {
  try {
    const v = localStorage.getItem(`${key(city)}:savedAt`);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

/**
 * Effective config = DEFAULT_ECONOMY + local (config) overrides
 * + derived promotions.effectivePerDay after applying city multiplier.
 *
 * Note: You ALSO have per-city overrides under the economy module
 * (key: citykul:economy:overrides:<city>). This loader keeps a separate
 * namespace so you can layer additional UI-specific knobs later.
 */
export function getEffectiveConfig(city) {
  const ov = getOverride(city) || {};
  let merged = deepMerge(DEFAULT_ECONOMY, ov);

  // Apply cityMultiplier if present for this city (non-persistent derived rule)
  const cm = merged?.promotions?.cityMultiplier || {};
  const factor = Number.isFinite(cm[city]) ? cm[city] : Number(cm.default ?? 1.0) || 1.0;

  if (merged?.promotions?.basePerDay) {
    const scaled = {};
    for (const [slot, base] of Object.entries(merged.promotions.basePerDay)) {
      const n = Number(base);
      scaled[slot] = Number.isFinite(n) ? Math.max(0, Math.round(n * factor * 100) / 100) : base;
    }
    merged = deepMerge(merged, {
      promotions: { effectivePerDay: scaled, _appliedMultiplier: factor }
    });
  }

  return merged;
}
