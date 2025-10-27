import { loadJSON, saveJSON } from "../storage";

const KEY_SUB = "citykul:jobs:submissions";
const KEY_APP = "citykul:jobs:approved";
/*
  Job: { id, title, org, type, location, salary, description, city, locality, status, createdBy, createdAt, mode: "formal"|"gig" }
*/
export function listApprovedJobs() {
  const arr = loadJSON(KEY_APP, []);
  return arr.sort((a,b)=>b.createdAt-a.createdAt);
}
export function listPendingJobs() {
  const arr = loadJSON(KEY_SUB, []);
  return arr.sort((a,b)=>b.createdAt-a.createdAt);
}
export function submitJob(payload) {
  const list = listPendingJobs();
  const j = { ...payload, id: crypto.randomUUID(), status:"pending", createdAt: Date.now() };
  list.unshift(j);
  saveJSON(KEY_SUB, list);
  return j;
}
export function approveJob(id) {
  const pending = listPendingJobs();
  const idx = pending.findIndex(d=>d.id===id);
  if (idx<0) return;
  const [job] = pending.splice(idx,1);
  job.status="approved";
  const approved = listApprovedJobs();
  approved.unshift(job);
  saveJSON(KEY_SUB, pending);
  saveJSON(KEY_APP, approved);
  return job;
}
export function rejectJob(id, reason="Not enough details") {
  const pending = listPendingJobs();
  const idx = pending.findIndex(d=>d.id===id);
  if (idx<0) return;
  pending[idx].status="rejected";
  pending[idx].reason = reason;
  saveJSON(KEY_SUB, pending);
  return pending[idx];
}
