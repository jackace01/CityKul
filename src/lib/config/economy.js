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

  // NEW: Voting model (DWQM) — city-tunable
  voting: {
    // Activity window used in quorum / "Active %" (days)
    activityWindowDays: 14,

    // Target approval threshold (tau) per stake tier
    // Low: Events, Discover, Marketplace; Medium: Jobs, Rentals; High: Contests, Hero, Disputes
    thresholds: {
      low: 0.60,
      medium: 0.66,
      high: 0.75,
    },

    // Dynamic quorum growth (controls how much weight is needed as active reviewers grow)
    // We operate in WEIGHT space; neededWeight = totalWeight * targetPercent
    // targetPercent is interpolated between [targetMin, targetMax] by activeRate (0..1)
    targetMin: 0.60,
    targetMax: 0.80,

    // Optional: module -> stake tier mapping (override if needed)
    tiersByModule: {
      events: "low",
      discover: "low",
      marketplace: "low",
      jobs: "medium",
      rentals: "medium",
      contests: "high",
      cityHero: "high",
      disputes: "high",
      appeals: "high",
    },

    // Verification bonuses (V) used in per-user vote weight
    // W = V + R, where R ∈ [0..2] from historical accuracy
    verificationBonus: {
      phone: 1.0,
      kyc: 1.5,
      address: 0.5, // optional extra if you enable address verification later
    },

    // Per-module reward pools (points) distributed proportionally among correct voters
    rewardPools: {
      events: 20,
      discover: 20,
      marketplace: 20,
      jobs: 30,
      rentals: 30,
      disputes: 180,  // as per your Jobs/Gigs disputes rule
      contests: 300,
      cityHero: 300,
      appeals: 100,
    },
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
