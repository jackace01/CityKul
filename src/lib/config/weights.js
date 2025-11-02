// src/lib/config/weights.js
// Admin-tunable weights for Reputation, Vote-Weight, Stake, Appeals.
// Per-city overrides live in localStorage at key: `citykul:weights:overrides:<city>`

const DEFAULTS = {
  rep: {
    baseByProfession: { default: 1.0 }, // e.g. { "Student": 0.8, "Teacher": 1.2 } via override
    kyc: { phoneEmail: 0.2, aadhaar: 0.4, pan: 0.4 },
    profileJobsCompleted: 0.3,
    jobCompleted: 0.2,
    jobDefault: -0.5,
    misconductReport: -0.3,
    contributionApproved: 0.1,
    contributionRejected: -0.1,
    voteCorrect: 0.05,
    voteWrong: -0.07,
    monthlyDecay: -0.01,
    clamp: { min: 0, max: 5000 },
  },
  vote: {
    floorFree: 0.30,
    capFree: 3.50,
    capMember: 5.00,
    deltaCorrect: 0.05,
    deltaWrong: -0.07,
  },
  stake: {
    percentAtAccept: 0.30, // lock 30% of current reputation
    burnOnDefault: 1.00,   // burn 100% of stake on default
    bonusOnSuccess: 0.10,  // +10% of stake returned as bonus
  },
  appeals: {
    feeINR: 50,
    splitToApp: 0.50,
    splitToReviewers: 0.50,
  },
};

function _k(city) {
  return `citykul:weights:overrides:${(city || "default").toLowerCase()}`;
}
function _loadJSON(key, fb) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
}
function _saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function deepMerge(a, b) {
  const out = { ...a };
  Object.keys(b || {}).forEach(k => {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) {
      out[k] = deepMerge(a[k] || {}, b[k]);
    } else {
      out[k] = b[k];
    }
  });
  return out;
}

export function getCityWeightsOverride(city) {
  return _loadJSON(_k(city), {});
}
export function setCityWeightsOverride(city, overrideObj = {}) {
  _saveJSON(_k(city), overrideObj || {});
}
export function patchCityWeightsOverride(city, patchObj = {}) {
  const cur = getCityWeightsOverride(city) || {};
  const next = deepMerge(cur, patchObj || {});
  setCityWeightsOverride(city, next);
  return next;
}

export function getWeightsForCity(city) {
  const ov = getCityWeightsOverride(city);
  return deepMerge(DEFAULTS, ov || {});
}

// Export defaults for UI reference
export const DEFAULT_WEIGHTS = DEFAULTS;
