// src/lib/config/economy.js
// Per-city economy config + loader for admin overrides (localStorage).
// NON-BREAKING UPGRADE: Keeps your existing API: getCityEconomy(city), setCityEconomyOverride(city, overrides)

export const DEFAULT_ECONOMY = {
  // Posting window for daily pending->posted (wallet scheduler)
  postingHour: 23,       // 11:00 PM local
  postingMinute: 0,
  minWithdrawal: 100,

  // Membership & onboarding
  membership: {
    priceINR: 100,        // mock membership fee used by UI
    welcomeBonusPts: 50,  // one-time bonus when user becomes a member
  },

  // Promotions pricing (per-day base, scaled city-wise if needed)
  promotions: {
    basePerDay: {
      rail: 10,     // points/day
      sidebar: 6,
      card: 4,
    },
    // Optional: per-city multiplier, fallback to default=1.0
    cityMultiplier: {
      default: 1.0,
      // "Mumbai": 1.3,
      // "Indore": 0.9,
    },
  },

  // Escrow/holds (used by gigs, rentals, etc.)
  escrow: {
    jobsHoldMultiplier: 1.5, // per your gig jobs rule: 1.5x of job value
    rentalHoldFixed: 50,     // fixed hold for local rentals (mock)
  },

  // Platform fees (future use)
  fees: {
    payoutPercent: 2.5, // % on payouts/cash-out
    listing: 0,         // flat listing fee if ever needed
  },

  // Rewards (defaults; can vary per module in later steps)
  rewards: {
    discoverPoster: 3,
    discoverReviewerTotal: 20,
    eventPoster: 3,
    eventReviewerTotal: 20,
    contestWinner: 500,
    contestVotersTotal: 300,
    heroVotersTotal: 300,

    // New micro-reward knobs (safe defaults)
    reviewVote: 0.2,      // per valid review vote
    postApproved: 2,      // approved feed post
  },
};

const OVERRIDES_KEY = (city) => `citykul:economy:overrides:${city || "default"}`;

export function getCityEconomy(city) {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY(city));
    const ovr = raw ? JSON.parse(raw) : {};
    const merged = deepMerge(DEFAULT_ECONOMY, ovr);

    // Derive effective promotion prices with city multiplier (does not persist)
    const cm = merged?.promotions?.cityMultiplier || {};
    const factor = Number.isFinite(cm[city]) ? cm[city] : Number(cm.default ?? 1.0) || 1.0;
    if (merged?.promotions?.basePerDay) {
      const eff = {};
      for (const [slot, base] of Object.entries(merged.promotions.basePerDay)) {
        const n = Number(base);
        eff[slot] = Number.isFinite(n) ? Math.max(0, Math.round(n * factor * 100) / 100) : base;
      }
      merged.promotions.effectivePerDay = eff;
      merged.promotions._appliedMultiplier = factor;
    }

    return merged;
  } catch {
    return DEFAULT_ECONOMY;
  }
}

export function setCityEconomyOverride(city, overrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY(city), JSON.stringify(overrides || {}));
  } catch {}
}

function deepMerge(base, extra) {
  if (Array.isArray(base)) return [...base];
  if (typeof base !== "object" || base === null) return base;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    if (typeof extra[k] === "object" && extra[k] && !Array.isArray(extra[k])) {
      out[k] = deepMerge(base[k] || {}, extra[k]);
    } else {
      out[k] = extra[k];
    }
  }
  return out;
}
