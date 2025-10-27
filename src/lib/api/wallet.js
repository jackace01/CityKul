// Local wallet: points balance + ledger, per user (CityKul keys + migration)
import { loadJSON, saveJSON } from "../storage";

const KEY = (userId) => `citykul:wallet:${userId || "guest"}`;

function load(userId) {
  return loadJSON(KEY(userId), { balance: 0, ledger: [] });
}
function save(userId, data) {
  saveJSON(KEY(userId), data);
}

export function getLedger(userId) {
  const { ledger } = load(userId);
  return Array.isArray(ledger) ? ledger : [];
}
export function getBalance(userId) {
  const { balance } = load(userId);
  return Number(balance || 0);
}
export function addPoints(userId, points, reason = "") {
  const cur = load(userId);
  const entry = {
    id: `w-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    points: Number(points || 0),
    reason: reason || "Adjustment",
  };
  cur.ledger.unshift(entry);
  cur.balance = Number(cur.balance || 0) + entry.points;
  save(userId, cur);
  return cur;
}
export function ensureDemoWallet(userId, isMember = false) {
  const cur = load(userId);
  if (cur.ledger.length) return cur;
  if (isMember) {
    addPoints(userId, 50, "Welcome bonus for becoming a member");
  }
  return load(userId);
}
