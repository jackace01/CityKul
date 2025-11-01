// src/lib/wallet/scheduler.js
// Posts pending rewards at configured time (23:00 by default).
// Strategy: On app load and then every 60s, check if the daily window has passed.
// If yes, post pending for the active user.

import { getCityEconomy } from "../config/economy.js";
import { postDueForUser } from "./ops.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function hasPostedToday(meta) {
  return meta?.lastPostIso === todayISO();
}

export function startWalletSchedulerForUser(userId, city, getMetaFn) {
  const cfg = getCityEconomy(city);
  const targetHour = cfg.postingHour ?? 23;
  const targetMinute = cfg.postingMinute ?? 0;

  function dueNow() {
    const now = new Date();
    if (now.getHours() < targetHour) return false;
    if (now.getHours() === targetHour && now.getMinutes() < targetMinute) return false;
    return true;
  }

  // Initial check + timer
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      const meta = getMetaFn ? getMetaFn(userId) : null;
      if (dueNow() && (!meta || meta.lastPostIso !== todayISO())) {
        // No meta access? Just post; ledger will update its own meta.
        postDueForUser(userId);
      }
    } catch {}
    ticking = false;
  }

  // First run & interval
  tick();
  const id = setInterval(tick, 60 * 1000);
  return () => clearInterval(id);
}
