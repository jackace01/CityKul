// src/lib/api/marketplace.js
import {
  submit, listApproved, listPending, vote, tryFinalize,
  ensureReviewer, getReviewers, quorumNeeded
} from "../review.js";

function toShape(rec) {
  const d = rec.data || {};
  return {
    id: rec.id,
    approved: rec.status === "approved",
    title: d.title || "Listing",
    price: Number(d.price || 0),
    where: d.location || d.locality || rec.city,
    category: d.category || "General",
    city: rec.city,
    createdAt: rec.createdAt,
    ownerId: d.ownerId || ""
  };
}

export function submitListing(payload) { return submit("marketplace", payload); }
export function listPendingListings(city) { return listPending(city, "marketplace").map(toShape); }
export function listApprovedListings(city) {
  const c = city || localStorage.getItem("citykul:city") || "Indore";
  return listApproved(c, "marketplace").map(toShape);
}
export function voteListing(id, reviewerId, approve) {
  vote("marketplace", id, reviewerId, approve);
  return tryFinalize("marketplace", id);
}
// reviewers
export function ensureMarketplaceReviewer(city, reviewerId) { ensureReviewer(city, "marketplace", reviewerId); }
export function getMarketplaceReviewers(city) { return getReviewers(city, "marketplace"); }
export function getMarketplaceQuorum(city) { return quorumNeeded(city, "marketplace"); }
