// src/components/WalletBanner.jsx
import { useEffect, useMemo, useState } from "react";
import { getUser } from "../lib/auth";
import { getLedger } from "../lib/wallet/ops";
import { getCityEconomy } from "../lib/config/economy";

function nextPostingDate(cfg) {
  const now = new Date();
  const d = new Date();
  d.setHours(cfg.postingHour ?? 23, cfg.postingMinute ?? 0, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WalletBanner() {
  const user = getUser();
  const uid = user?.email || user?.name || "guest@demo";
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
  const cfg = getCityEconomy(city);

  const [now, setNow] = useState(Date.now());
  const ledger = useMemo(() => getLedger(uid), [uid, now]);

  const pendingTotal = useMemo(() => {
    return ledger
      .filter((e) => e.state === "pending")
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }, [ledger]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const np = nextPostingDate(cfg);
  const ms = np.getTime() - now;

  // Hide the banner when there is nothing pending
  if (!pendingTotal) return null;

  return (
    <div className="sticky top-0 z-30 bg-[var(--color-app)]/80 backdrop-blur border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-2 text-xs flex items-center gap-3">
        <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full ring-1 ring-[var(--color-border)]">
          🪙 Pending rewards
        </span>
        <span>₹ {pendingTotal.toFixed(2)} will post at {String(cfg.postingHour).padStart(2, "0")}:{String(cfg.postingMinute).padStart(2, "0")} —</span>
        <span className="tabular-nums">{formatCountdown(ms)}</span>
      </div>
    </div>
  );
}
