// src/lib/api/promotions.js
// City-aware promotions (ads) with review workflow + ESCROW billing.
// Uses the shared weighted-review engine (review.js) under module "promotions".
// Flow:
//  - On submit: createHold(from=ownerId, amount)  [funds locked, not spent]
//  - On approve: releaseHold(to=PLATFORM_ID)      [funds move to platform]
//  - On reject: refundHold()                      [funds return to owner]

import {
  submit,
  listApproved,
  listPending,
  tryFinalize,
  vote,
  ensureReviewer,
  getSubmissionById,
} from "../review";
import { getUser, isMember } from "../auth";
import {
  ensureDemoWallet,
  createHold,
  releaseHold,
  refundHold,
} from "../api/wallet";
import { notify } from "../notifications";

// ---- Platform wallet --------------------------------------------------------
const PLATFORM_ID = "platform@citykul";

// ---- Pricing & slots --------------------------------------------------------
/**
 * Slots:
 *  - "rail": top/featured placement (home + key pages)
 *  - "sidebar": right column
 *  - "inline": within lists
 */
export const PROMO_SLOTS = ["rail", "sidebar", "inline"];

export function pricePerDay(slot = "rail") {
  switch (slot) {
    case "rail":
      return 20; // points/day
    case "sidebar":
      return 8;
    case "inline":
      return 4;
    default:
      return 10;
  }
}

export function computePrice({ slot = "rail", startDate, endDate }) {
  const p = pricePerDay(slot);
  const s = new Date(startDate).setHours(0, 0, 0, 0);
  const e = new Date(endDate).setHours(23, 59, 59, 999);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
  const days = Math.max(1, Math.ceil((e - s) / (24 * 60 * 60 * 1000)));
  return p * days;
}

// ---- Targeting --------------------------------------------------------------
/**
 * target: { city: string, locality?: string } // city required
 */
export function matchesTarget(p, city, locality = "") {
  const t = p?.target || {};
  if (!t.city) return false;
  if ((t.city || "").toLowerCase() !== String(city || "").toLowerCase()) return false;
  if (!t.locality) return true;
  return (t.locality || "").toLowerCase() === String(locality || "").toLowerCase();
}

export function isActiveWindow(p, now = Date.now()) {
  const s = new Date(p.startDate).getTime();
  const e = new Date(p.endDate).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
  return now >= s && now <= e;
}

// ---- Internal helpers -------------------------------------------------------
function promoOrderId(submissionId) {
  return `promo:${submissionId}`;
}

function safeNotify(userId, msg) {
  try {
    notify(userId, msg);
  } catch {}
}

// ---- Submit + Review flow (ESCROW) -----------------------------------------
/**
 * payload shape (required fields):
 * {
 *   title, org, description?, imageUrl?, ctaText?, ctaHref?,
 *   slot: "rail"|"sidebar"|"inline",
 *   startDate, endDate,
 *   target: { city, locality? }
 * }
 */
export function submitPromotion(payload) {
  const u = getUser();
  const ownerId = u?.email || u?.name || "guest@demo";
  const city =
    payload?.target?.city || u?.city || localStorage.getItem("citykul:city") || "";

  if (!isMember()) throw new Error("Only members can submit promotions.");
  if (!payload?.title || !payload?.slot || !payload?.startDate || !payload?.endDate) {
    throw new Error("Missing required fields.");
  }
  if (!city) throw new Error("Target city is required.");

  const amount = computePrice({
    slot: payload.slot,
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
  if (amount <= 0) throw new Error("Invalid schedule or slot.");

  // ensure wallets exist (demo)
  ensureDemoWallet(ownerId, true);
  ensureDemoWallet(PLATFORM_ID, true);

  // store promo via review engine (status=pending)
  const rec = submit("promotions", {
    ...payload,
    city,
    ownerId,
    createdAt: Date.now(),
    amount,
  });

  // create escrow hold for this submission
  try {
    const orderId = promoOrderId(rec.id);
    createHold(orderId, ownerId, amount, `Promo booking (${payload.slot})`);
  } catch (err) {
    // If hold fails, we should not leave an unpaid submission dangling.
    // In a real backend we'd rollback the submission; for demo, we just warn.
    safeNotify(ownerId, {
      title: "Promotion submission issue",
      body: "We couldn't lock funds for your promotion. Review may still proceed in demo.",
      href: "/promotions",
    });
  }

  // notify owner
  safeNotify(ownerId, {
    title: "Promotion submitted",
    body: `“${payload.title}” is pending review. Funds are held in escrow.`,
    href: "/promotions",
  });

  return rec;
}

export function ensurePromoReviewer(city, reviewerId) {
  ensureReviewer(city, "promotions", reviewerId);
}

/**
 * votePromotion(id, reviewerId, approve)
 * - casts a vote, tries to finalize, and if finalized:
 *   - approved: release hold -> PLATFORM_ID
 *   - rejected: refund hold -> owner
 */
export function votePromotion(id, reviewerId, approve) {
  vote("promotions", id, reviewerId, !!approve);

  // attempt finalize immediately (idempotent)
  const finalized = tryFinalize("promotions", id);

  // If not finalized yet, nothing else to do
  const rec = getSubmissionById("promotions", id);
  if (!rec || rec.status === "pending") return;

  const ownerId = rec?.data?.ownerId || rec?.ownerId || "guest@demo";
  const orderId = promoOrderId(id);

  // ensure wallets exist (defensive)
  try {
    ensureDemoWallet(ownerId, true);
    ensureDemoWallet(PLATFORM_ID, true);
  } catch {}

  if (rec.status === "approved") {
    // release escrow to platform
    try {
      releaseHold(orderId, PLATFORM_ID);
      safeNotify(ownerId, {
        title: "Promotion approved",
        body: `Your promo “${rec?.data?.title || "Promotion"}” is approved. Payment captured.`,
        href: "/promotions",
      });
      safeNotify(PLATFORM_ID, {
        title: "Promo payment received",
        body: `Received ${rec?.data?.amount || ""} pts from ${ownerId} for an approved promotion.`,
      });
    } catch (e) {
      // hold may already be released; ignore in demo
    }
  } else if (rec.status === "rejected") {
    // refund escrow to owner
    try {
      refundHold(orderId);
      safeNotify(ownerId, {
        title: "Promotion rejected",
        body: `Your promo “${rec?.data?.title || "Promotion"}” was rejected. Funds refunded.`,
        href: "/promotions",
      });
    } catch (e) {
      // hold may have been refunded already; ignore in demo
    }
  }
}

export function listPendingPromotions(city) {
  return listPending(city, "promotions");
}

export function listApprovedPromotions(city) {
  return listApproved(city, "promotions");
}

export function getActivePromotions(city, locality = "", now = Date.now()) {
  const rows = listApprovedPromotions(city) || [];
  return rows
    .filter((p) => matchesTarget(p, city, locality) && isActiveWindow(p, now))
    .sort((a, b) => {
      // rail first, then sidebar, then inline; tiebreak by createdAt
      const order = { rail: 0, sidebar: 1, inline: 2 };
      const da = order[a.data?.slot || a.slot || "inline"];
      const db = order[b.data?.slot || b.slot || "inline"];
      if (da !== db) return da - db;
      return (b.data?.createdAt || b.createdAt || 0) - (a.data?.createdAt || a.createdAt || 0);
    })
    .map((r) => r.data || r); // normalize to payload shape
}

/** Convenience for "My Promos" tab (from approved + pending). */
export function listMyPromotions(ownerId) {
  const u = getUser();
  const my = ownerId || u?.email || u?.name || "guest@demo";
  const cities = [u?.city, localStorage.getItem("citykul:city")].filter(Boolean);
  const seen = new Set();
  const out = [];

  function pushUnique(arr, status) {
    (arr || []).forEach((r) => {
      const rec = r.data || r;
      if (rec?.ownerId === my) {
        const id = r.id || rec.id;
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ ...rec, _id: id, _status: r.status || status || "approved" });
        }
      }
    });
  }

  const uniqCities = Array.from(new Set(cities));
  uniqCities.forEach((c) => {
    pushUnique(listApprovedPromotions(c), "approved");
    pushUnique(listPendingPromotions(c), "pending");
  });

  return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
