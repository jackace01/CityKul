import { loadJSON, saveJSON } from "../storage";

const KEY_SUB = "citykul:deals:submissions";
const KEY_APP = "citykul:deals:approved";
/*
  Deal: { id, title, where, description, price, images[], city, locality, status, createdBy, createdAt }
*/
export function listApprovedDeals() {
  const arr = loadJSON(KEY_APP, []);
  return arr.sort((a,b)=>b.createdAt-a.createdAt);
}
export function listPendingDeals() {
  const arr = loadJSON(KEY_SUB, []);
  return arr.sort((a,b)=>b.createdAt-a.createdAt);
}
export function submitDeal(payload) {
  const list = listPendingDeals();
  const item = { ...payload, id: crypto.randomUUID(), status: "pending", createdAt: Date.now() };
  list.unshift(item);
  saveJSON(KEY_SUB, list);
  return item;
}
export function approveDeal(id) {
  const pending = listPendingDeals();
  const idx = pending.findIndex(d=>d.id===id);
  if (idx<0) return;
  const [deal] = pending.splice(idx,1);
  deal.status="approved";
  const approved = listApprovedDeals();
  approved.unshift(deal);
  saveJSON(KEY_SUB, pending);
  saveJSON(KEY_APP, approved);
  return deal;
}
export function rejectDeal(id, reason="Not enough details") {
  const pending = listPendingDeals();
  const idx = pending.findIndex(d=>d.id===id);
  if (idx<0) return;
  pending[idx].status="rejected";
  pending[idx].reason = reason;
  saveJSON(KEY_SUB, pending);
  return pending[idx];
}
