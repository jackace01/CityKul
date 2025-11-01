// src/lib/gate.js
// Central place for action-level guards.
// Returns { ok: boolean, reason?: "subscribe"|"resident"|string }

import { getUser, isMember } from "./auth";

/**
 * Members-only & signed-in check for reviews/helpful-votes.
 * Also requires a selected/verified city (resident).
 */
export function canReviewOrVote() {
  const u = getUser();
  if (!u) return { ok: false, reason: "subscribe" }; // not logged in → funnel to membership/login
  if (!isMember()) return { ok: false, reason: "subscribe" }; // require membership
  if (!u.city) return { ok: false, reason: "resident" }; // require city presence
  return { ok: true };
}

/**
 * Guard for posting content (events, jobs, deals, listings, etc.).
 * Requires login + active membership + city set.
 */
export function canPost() {
  const u = getUser();
  if (!u) return { ok: false, reason: "subscribe" };
  if (!isMember()) return { ok: false, reason: "subscribe" };
  if (!u.city) return { ok: false, reason: "resident" };
  return { ok: true };
}
