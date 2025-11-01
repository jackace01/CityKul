// src/lib/fees.js
// Simple fee policy: payer-borne fees (do NOT alter escrow amount).
// Platform fee percent + fixed booking fee.

const POLICY_KEY = "citykul:fees:policy";

function loadPolicy() {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    platformPercent: 5,   // 5% of rent (not deposit)
    fixedBookingFee: 10,  // flat (₹)
    minPlatformFee: 5     // ensure a reasonable minimum
  };
}

export function getFeePolicy() {
  return loadPolicy();
}

/**
 * computeRentalFees({ rent, deposit })
 * - Fees only on rent (payer-borne).
 * - Escrow hold remains rent + deposit (owner gets this on release).
 * - Payer pays (separately) platform fee + fixed booking fee at pay time.
 */
export function computeRentalFees({ rent = 0, deposit = 0 }) {
  const p = loadPolicy();
  const pct = Math.max(0, Number(p.platformPercent || 0));
  const fixed = Math.max(0, Number(p.fixedBookingFee || 0));
  const min = Math.max(0, Number(p.minPlatformFee || 0));

  const platformFee = Math.max(min, Math.round((Number(rent) || 0) * (pct / 100)));
  const fixedFee = fixed;

  return {
    platformFee,
    fixedFee,
    totalFee: platformFee + fixedFee,
    policy: p
  };
}
