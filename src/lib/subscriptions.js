// src/lib/subscriptions.js
// Centralized subscription logic for CityKul
// Stores canonical state in both user object (for quick checks) and localStorage (audit-ish)

import { getUser, setUser } from "./auth";
import {
  getBalance,
  withdrawImmediate,
  transferImmediate,
  depositImmediate,
  ensureDemoWallet,
} from "./wallet/ops.js";

const PLATFORM_ID = "platform@citykul";
const LS_PREFIX = "citykul:subs";

// ---- Plan Catalog ----
// Points are the in-app currency (treat 1 point ~= ₹1 for mock)
const PLANS = [
  {
    id: "member",
    name: "Member",
    pricePts: 100,           // ₹100 / year (mock)
    durationDays: 365,
    perks: [
      "Post Events, Jobs, Marketplace deals",
      "Earn points for valid posts & verifications",
      "Blue tick next to your name",
      "Priority placement in local listings",
    ],
    badge: "✓",
  },
  {
    id: "business",
    name: "Business",
    pricePts: 999,           // ₹999 / year (mock)
    durationDays: 365,
    perks: [
      "All Member perks",
      "Promotions booking priority",
      "Business badge on profile",
      "Early access to city promos & tools",
    ],
    badge: "★",
  },
];

export function getPlans() {
  return PLANS.slice();
}

function subKey(userId) {
  return `${LS_PREFIX}:${userId || "guest"}`;
}

// Persist a minimal “subscription record” for audit & admin
function writeSubRecord(userId, rec) {
  try {
    localStorage.setItem(subKey(userId), JSON.stringify(rec));
  } catch {}
}

function readSubRecord(userId) {
  try {
    const raw = localStorage.getItem(subKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---- Helpers ----
function nowTs() { return Date.now(); }
function days(n) { return n * 24 * 60 * 60 * 1000; }

export function getActive(userArg) {
  const u = userArg || getUser();
  if (!u) return null;
  const until = Number(u.memberUntil || 0);
  const planId = u.memberPlan || (u.member ? "member" : "");
  if (!planId) return null;
  if (until && until > nowTs()) {
    return { planId, until, daysLeft: Math.max(0, Math.ceil((until - nowTs()) / days(1))) };
  }
  return null;
}

export function isActiveMember() {
  return !!getActive();
}

export function getRemainingDays() {
  const a = getActive();
  return a ? a.daysLeft : 0;
}

export function findPlan(planId) {
  return PLANS.find(p => p.id === planId) || null;
}

// Trial: one-time free 7-day Member for new users (optional, safe idempotent)
export function grantTrialIfEligible() {
  const u = getUser();
  if (!u) return;
  const userId = u.email || u.name || "guest";
  const trialKey = `${LS_PREFIX}:trial:${userId}`;
  try {
    if (!localStorage.getItem(trialKey)) {
      const until = nowTs() + days(7);
      const next = {
        ...u,
        member: true,
        memberPlan: "member",
        memberUntil: until,
      };
      setUser(next);
      writeSubRecord(userId, { userId, planId: "member", startedAt: nowTs(), until, source: "trial" });
      localStorage.setItem(trialKey, "1");
    }
  } catch {}
}

// Core: activate/renew a plan using wallet points
export function activatePlan(planId) {
  const u = getUser();
  if (!u) throw new Error("Please login");
  const userId = u.email || u.name || "guest";

  const plan = findPlan(planId);
  if (!plan) throw new Error("Invalid plan");

  // Ensure wallet exists + show/demo bonus if applicable
  try { ensureDemoWallet(userId, !!u.member); } catch {}

  const price = Number(plan.pricePts || 0);
  const bal = Number(getBalance(userId) || 0);
  if (bal < price) {
    throw new Error(`Insufficient balance. Need ${price} pts, you have ${bal} pts.`);
  }

  // Charge user & credit platform (mock payment)
  withdrawImmediate(userId, price, `Subscription: ${plan.name}`);
  transferImmediate(userId, PLATFORM_ID, 0, `Subscription payment route ${plan.name}`); // keep route note without double-charging
  // For clarity in Platform wallet, separately credit exact price:
  depositImmediate(PLATFORM_ID, price, `Subscription payment for ${plan.id}`, { from: userId });

  // Extend/renew: if current membership still active, extend from existing until
  const previousUntil = Number(u.memberUntil || 0);
  const base = previousUntil && previousUntil > nowTs() ? previousUntil : nowTs();
  const until = base + days(plan.durationDays || 365);

  const next = {
    ...u,
    member: true,
    memberPlan: plan.id,
    memberUntil: until,
  };
  setUser(next);

  writeSubRecord(userId, {
    userId,
    planId: plan.id,
    startedAt: nowTs(),
    until,
    amount: price,
    source: "wallet",
  });

  return next;
}

export function cancelAutoRenewNoteOnly() {
  // We don't have recurring billing in mock. Provide a local flag to mark "non-renew"
  const u = getUser();
  if (!u) return;
  const userId = u.email || u.name || "guest";
  try {
    localStorage.setItem(`${subKey(userId)}:no_renew`, "1");
  } catch {}
}

export function getWalletInfo() {
  const u = getUser();
  const userId = u?.email || u?.name || "guest";
  return {
    userId,
    balance: Number(getBalance(userId) || 0),
  };
}
