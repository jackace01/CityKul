// src/lib/api/jobs.js
import {
  submit, listApproved, listPending, vote, tryFinalize,
  ensureReviewer, getReviewers, quorumNeeded
} from "../review.js";

function toShape(rec) {
  const d = rec.data || {};
  return {
    id: rec.id,
    approved: rec.status === "approved",
    title: d.title || "Job",
    org: d.company || d.org || "",
    type: d.type || d.category || "General",
    location: d.location || d.locality || rec.city,
    city: rec.city,
    createdAt: rec.createdAt,
    ownerId: d.ownerId || ""
  };
}

export function submitJob(payload) { return submit("jobs", payload); }
export function listPendingJobs(city) { return listPending(city, "jobs").map(toShape); }
export function listApprovedJobs(city) {
  const c = city || localStorage.getItem("citykul:city") || "Indore";
  return listApproved(c, "jobs").map(toShape);
}
export function voteJob(id, reviewerId, approve) {
  vote("jobs", id, reviewerId, approve);
  return tryFinalize("jobs", id);
}
// reviewers
export function ensureJobsReviewer(city, reviewerId) { ensureReviewer(city, "jobs", reviewerId); }
export function getJobsReviewers(city) { return getReviewers(city, "jobs"); }
export function getJobsQuorum(city) { return quorumNeeded(city, "jobs"); }
