// src/lib/experiments.js
// Feature flags / experiments (safe defaults).
export const experiments = {
  reviewHelpfulVotes: true,
  entityBadges: true,
  escrowFlows: true,
};

export function isOn(flag) {
  return !!experiments[flag];
}
