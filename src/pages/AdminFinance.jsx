// src/pages/AdminFinance.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getLedger, getBalance } from "../lib/api/wallet";
import { listModerationLog } from "../lib/review";

/**
 * PLATFORM WALLET DASHBOARD (read-only)
 * Adds City column + City Breakdown. CSV includes City.
 */
const PLATFORM_ID = "platform@citykul";

const QUICK_RANGES = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 365 days", days: 365 },
  { id: "all", label: "All time", days: null },
];

function n(x, def = 0) { const v = Number(x); return Number.isFinite(v) ? v : def; }

function normalizeRow(r) {
  if (!r) return null;
  const ts = n(r.ts, Date.now());
  const delta = Number.isFinite(r.delta) ? r.delta
               : Number.isFinite(r.amount) ? r.amount
               : Number.isFinite(r.points) ? r.points
               : 0;
  const reason = String(r.reason || "");
  const refFromReason = (() => {
    const m = reason.match(/\bfor\s+([A-Za-z0-9\-\:_]+)/i);
    return m ? m[1] : "";
  })();
  const refId = String(r.refId || refFromReason || "");
  const city =
    r?.meta?.city ||
    r?.meta?.target?.city ||
    r?.meta?.cityName ||
    ""; // may be blank for older rows

  return {
    id: String(r.id || `${ts}-${Math.random().toString(36).slice(2,6)}`),
    ts,
    delta: n(delta, 0),
    balance: Number.isFinite(r.balance) ? r.balance : null,
    reason,
    refId,
    city,
    raw: r,
  };
}

function toCSV(rows) {
  const header = ["Time","Type","Amount","BalanceAfter","Reason","RefId","City"];
  const body = rows.map((r) => [
    new Date(r.ts).toISOString(),
    r.delta >= 0 ? "CREDIT" : "DEBIT",
    (r.delta || 0).toFixed(2),
    r.balance === null || r.balance === undefined ? "" : String(r.balance),
    `"${String(r.reason || "").replace(/"/g, '""')}"`,
    r.refId || "",
    r.city || "",
  ]);
  return [header, ...body].map((row) => row.join(",")).join("\n");
}

export default function AdminFinance() {
  const [quick, setQuick] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const [balance, setBalance] = useState(0);
  const [rawLedger, setRawLedger] = useState([]);

  const [modlog, setModlog] = useState([]);

  useEffect(() => {
    try { setBalance(getBalance(PLATFORM_ID) || 0); } catch {}
    try { const led = getLedger(PLATFORM_ID) || []; setRawLedger(Array.isArray(led) ? led : []); } catch {}
    try { const rows = listModerationLog({ limit: 1000 }); setModlog(Array.isArray(rows) ? rows : []); } catch {}
  }, []);

  const ledger = useMemo(() => {
    return rawLedger.map(normalizeRow).filter(Boolean).sort((a,b)=>(b.ts||0)-(a.ts||0));
  }, [rawLedger]);

  const now = Date.now();
  const { startTs, endTs } = useMemo(() => {
    if (quick !== "all" && QUICK_RANGES.find((x) => x.id === quick)) {
      const days = QUICK_RANGES.find((x) => x.id === quick).days;
      const start = new Date(now - days * 24 * 60 * 60 * 1000);
      const end = new Date(now + 24 * 60 * 60 * 1000);
      return { startTs: start.getTime(), endTs: end.getTime() };
    }
    const s = from ? new Date(from + " 00:00:00").getTime() : 0;
    const e = to ? new Date(to + " 23:59:59").getTime() : now + 24 * 60 * 60 * 1000;
    return { startTs: s, endTs: e };
  }, [quick, from, to]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return ledger.filter((r) => {
      if (r.ts < startTs || r.ts > endTs) return false;
      if (!lc) return true;
      const hay =
        (r.reason || "").toLowerCase() + " " +
        (r.refId || "").toLowerCase() + " " +
        (r.city || "").toLowerCase() + " " +
        new Date(r.ts).toISOString().toLowerCase();
      return hay.includes(lc);
    });
  }, [ledger, startTs, endTs, q]);

  const summary = useMemo(() => {
    const credits = filtered.filter((r) => r.delta >= 0);
    const debits = filtered.filter((r) => r.delta < 0);
    const creditSum = credits.reduce((s, r) => s + r.delta, 0);
    const debitSum = debits.reduce((s, r) => s + Math.abs(r.delta), 0);
    return { count: filtered.length, credits: creditSum, debits: debitSum, net: creditSum - debitSum };
  }, [filtered]);

  const modById = useMemo(() => {
    const map = new Map();
    for (const r of modlog) { if (!r?.id) continue; map.set(String(r.id), r); }
    return map;
  }, [modlog]);

  // City-wise breakdown on current filtered rows
  const cityBreakdown = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const c = (r.city || "—");
      const cur = map.get(c) || { credits: 0, debits: 0, net: 0, count: 0 };
      if (r.delta >= 0) cur.credits += r.delta; else cur.debits += Math.abs(r.delta);
      cur.net = cur.credits - cur.debits;
      cur.count += 1;
      map.set(c, cur);
    }
    return Array.from(map.entries())
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.net - a.net);
  }, [filtered]);

  function exportCSV() {
    try {
      const csv = toCSV(filtered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `citykul-platform-ledger-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch {
      alert("Could not export CSV");
    }
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <Section title="Platform Wallet — Ledger (read-only)">
            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <div className="text-xs text-[var(--color-muted)]">Current Balance</div>
                <div className="text-2xl font-semibold mt-1">{Math.round(balance)}</div>
                <div className="text-[11px] text-[var(--color-muted)]">Account: {PLATFORM_ID}</div>
              </Card>
              <Card>
                <div className="text-xs text-[var(--color-muted)]">Credits (filtered)</div>
                <div className="text-xl font-semibold mt-1">+{summary.credits.toFixed(2)}</div>
                <div className="text-[11px] text-[var(--color-muted)]">{filtered.filter(r => r.delta >= 0).length} entries</div>
              </Card>
              <Card>
                <div className="text-xs text-[var(--color-muted)]">Debits (filtered)</div>
                <div className="text-xl font-semibold mt-1">-{summary.debits.toFixed(2)}</div>
                <div className="text-[11px] text-[var(--color-muted)]">{filtered.filter(r => r.delta < 0).length} entries</div>
              </Card>
              <Card>
                <div className="text-xs text-[var(--color-muted)]">Net (filtered)</div>
                <div className={`text-xl font-semibold mt-1 ${summary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {summary.net >= 0 ? "+" : "-"}{Math.abs(summary.net).toFixed(2)}
                </div>
                <div className="text-[11px] text-[var(--color-muted)]">{summary.count} rows</div>
              </Card>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_1fr_160px]">
              <div className="flex gap-1">
                {QUICK_RANGES.map((r) => (
                  <button key={r.id} onClick={() => setQuick(r.id)}
                          className={`px-2 py-1 rounded text-xs ${quick === r.id ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              <label className="text-xs flex items-center gap-2">From
                <input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setQuick("all"); }}
                       className="px-2 py-1 rounded ring-1 ring-[var(--color-border)] bg-white dark:bg-gray-900"/>
              </label>
              <label className="text-xs flex items-center gap-2">To
                <input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setQuick("all"); }}
                       className="px-2 py-1 rounded ring-1 ring-[var(--color-border)] bg-white dark:bg-gray-900"/>
              </label>
              <input placeholder="Search (reason / refId / city)" value={q} onChange={(e)=>setQ(e.target.value)}
                     className="px-2 py-1 rounded ring-1 ring-[var(--color-border)] bg-white dark:bg-gray-900 text-sm"/>
            </div>

            <div className="mt-3">
              <button onClick={exportCSV} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white text-sm">
                Export CSV for CA
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-elev)]">
                  <tr>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-right px-3 py-2">Balance</th>
                    <th className="text-left px-3 py-2">Reason</th>
                    <th className="text-left px-3 py-2">Ref ID</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-left px-3 py-2">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-[var(--color-muted)]">No ledger entries in this range.</td></tr>
                  ) : (
                    filtered.map((r) => {
                      const mod = r.refId ? modById.get(r.refId) : null;
                      const type = r.delta >= 0 ? "CREDIT" : "DEBIT";
                      const amt = Math.abs(r.delta || 0);
                      return (
                        <tr key={r.id} className="border-t border-[var(--color-border)] align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(r.ts).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${type === "CREDIT" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{type}</span>
                          </td>
                          <td className="px-3 py-2 text-right">{amt.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{r.balance === null || r.balance === undefined ? "—" : r.balance}</td>
                          <td className="px-3 py-2">{r.reason || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.refId || "—"}</td>
                          <td className="px-3 py-2">{r.city || "—"}</td>
                          <td className="px-3 py-2">
                            {mod ? (
                              <div className="text-xs">
                                <div><b>{mod.module}</b> · {mod.city || "—"}</div>
                                <div className="mt-1">
                                  <span className={`px-2 py-0.5 rounded-full ${mod.status === "approved" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{mod.status}</span>
                                  <span className="ml-2 text-[var(--color-muted)]">quorum need {mod.quorum?.neededWeight ?? "?"} / total {mod.quorum?.totalWeight ?? "?"}</span>
                                </div>
                              </div>
                            ) : <span className="text-xs text-[var(--color-muted)]">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* NEW: City breakdown */}
          <Section title="City Breakdown (filtered)">
            {cityBreakdown.length ? (
              <div className="overflow-auto rounded-xl ring-1 ring-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-elev)]">
                    <tr>
                      <th className="text-left px-3 py-2">City</th>
                      <th className="text-right px-3 py-2">Credits</th>
                      <th className="text-right px-3 py-2">Debits</th>
                      <th className="text-right px-3 py-2">Net</th>
                      <th className="text-right px-3 py-2">Rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityBreakdown.map((row) => (
                      <tr key={row.city} className="border-t border-[var(--color-border)]">
                        <td className="px-3 py-2">{row.city}</td>
                        <td className="px-3 py-2 text-right">+{row.credits.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">-{row.debits.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right ${row.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {row.net >= 0 ? "+" : "-"}{Math.abs(row.net).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No data.</div>
            )}
          </Section>

          <Section title="How to read this (for CA)">
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <div className="font-semibold">Credits vs Debits</div>
                <ul className="mt-2 list-disc list-inside text-sm text-[var(--color-muted)]">
                  <li><b>Credit</b> = Platform receives points (e.g., ad/promo approved → escrow released).</li>
                  <li><b>Debit</b> = Platform spends/adjusts points (manual adjustments, future payouts).</li>
                  <li>Each row has time, amount, reason, optional <b>City</b>, and a <b>Ref ID</b> when available.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold">Reconciliation with Moderation Log</div>
                <ul className="mt-2 list-disc list-inside text-sm text-[var(--color-muted)]">
                  <li>“Escrow release for &lt;id&gt;” → match the same <b>id</b> in Decision.</li>
                  <li><b>approved</b> → expect a platform <b>Credit</b>; <b>rejected</b> → refund/none depending on flow.</li>
                  <li>Export filtered CSV for monthly books.</li>
                </ul>
              </Card>
            </div>
          </Section>
        </div>

        {/* Right panel tips */}
        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tips</div>
            <ul className="mt-2 text-xs text-[var(--color-muted)] space-y-2">
              <li>Use quick ranges to prepare monthly/quarterly CSVs.</li>
              <li>Search by part of reason, refId, or city.</li>
              <li>Ensure money actions pass <code>meta.city</code> into ledger writes.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
