// src/pages/Wallet.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import {
  getBalance,
  getLedger,
  ensureDemoWallet,
  deposit,
  withdraw,
  getUserHolds,
} from "../lib/api/wallet";
import BecomeMemberButton from "../components/BecomeMemberButton";

function toCsv(rows = []) {
  const header = ["id", "timestamp", "datetime", "reason", "points"];
  const lines = rows.map((r) => [
    r.id,
    r.ts,
    new Date(r.ts).toISOString(),
    (r.reason || "").replace(/\n/g, " ").replace(/"/g, '""'),
    r.points,
  ]);
  const all = [header, ...lines]
    .map((cols) =>
      cols
        .map((c) => (typeof c === "string" ? `"${c}"` : String(c)))
        .join(",")
    )
    .join("\n");
  return "data:text/csv;charset=utf-8," + encodeURIComponent(all);
}

export default function Wallet() {
  const u = getUser();
  const uid = u?.email || u?.name || "guest@demo";
  const member = isMember();

  useEffect(() => {
    if (uid) ensureDemoWallet(uid, member);
  }, [uid, member]);

  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("overview"); // "overview" | "ledger"
  const bump = () => setTick((t) => t + 1);

  const balance = useMemo(() => getBalance(uid), [uid, tick]);
  const ledger = useMemo(() => getLedger(uid), [uid, tick]);
  const holds = useMemo(() => getUserHolds(uid), [uid, tick]);

  function onTopUp() {
    try {
      deposit(uid, 100, "Top-up (demo)");
      bump();
    } catch {
      alert("Top-up failed");
    }
  }
  function onWithdraw() {
    try {
      withdraw(uid, 50, "Cash-out (demo)");
      bump();
    } catch (e) {
      alert(e.message || "Withdraw failed");
    }
  }

  const csvHref = useMemo(() => toCsv(ledger), [ledger]);

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN */}
        <div className="grid gap-6">
          {/* Tabs */}
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("overview")}
                className={`px-3 py-2 rounded-lg text-sm ${
                  tab === "overview"
                    ? "bg-[var(--color-accent)] text-white"
                    : "ring-1 ring-[var(--color-border)]"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setTab("ledger")}
                className={`px-3 py-2 rounded-lg text-sm ${
                  tab === "ledger"
                    ? "bg-[var(--color-accent)] text-white"
                    : "ring-1 ring-[var(--color-border)]"
                }`}
              >
                Ledger
              </button>
            </div>
          </div>

          {tab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Wallet & Earnings">
                <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
                  <div className="text-sm text-[var(--color-muted)]">
                    Current Balance
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    ₹ {Number(balance || 0).toLocaleString()}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={onTopUp}
                      className="btn-solid"
                      aria-label="Add one hundred rupees to wallet (demo)"
                    >
                      + ₹100 (demo)
                    </button>
                    <button
                      onClick={onWithdraw}
                      className="btn-ghost"
                      aria-label="Withdraw fifty rupees"
                    >
                      Withdraw ₹50
                    </button>
                  </div>

                  {!member ? (
                    <div className="mt-3 text-sm">
                      You’re on a free plan. Become a member to start posting and
                      earning.
                      <div className="mt-2">
                        <BecomeMemberButton label="Become a member →" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-[var(--color-muted)]">
                      Earn via approvals, reviews, votes, contests & completed
                      transactions.
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
                  <div className="font-semibold mb-2">Recent Activity</div>
                  {ledger && ledger.length ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-[var(--color-muted)]">
                          <tr>
                            <th className="py-2 pr-3">When</th>
                            <th className="py-2 pr-3">Reason</th>
                            <th className="py-2 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.slice(0, 12).map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-[var(--color-border)]"
                            >
                              <td className="py-2 pr-3">
                                {new Date(row.ts).toLocaleString()}
                              </td>
                              <td className="py-2 pr-3">{row.reason}</td>
                              <td className="py-2 text-right font-medium">
                                {row.points > 0 ? `+${row.points}` : row.points}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--color-muted)]">
                      No activity yet. Participate to start earning!
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Escrow Holds">
                {holds?.length ? (
                  <div className="overflow-auto rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                    <table className="w-full text-sm">
                      <thead className="text-left text-[var(--color-muted)]">
                        <tr>
                          <th className="py-2 pr-3">Order</th>
                          <th className="py-2 pr-3">Role</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holds.map((h, i) => (
                          <tr
                            key={i}
                            className="border-t border-[var(--color-border)]"
                          >
                            <td className="py-2 pr-3">{h.orderId}</td>
                            <td className="py-2 pr-3">
                              {h.fromId === uid ? "Payer" : "Payee"}
                            </td>
                            <td className="py-2 pr-3">
                              ₹ {Number(h.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3">{h.status}</td>
                            <td className="py-2">
                              {new Date(
                                h.ts ||
                                  h.releasedAt ||
                                  h.refundedAt ||
                                  Date.now()
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
                    No holds yet. Your escrowed bookings will appear here.
                  </div>
                )}
              </Section>
            </div>
          ) : (
            // LEDGER TAB
            <Section
              title="Full Ledger (Audit)"
              rightHref={csvHref}
              rightText="Export CSV"
            >
              {ledger && ledger.length ? (
                <div className="overflow-auto rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[var(--color-muted)]">
                      <tr>
                        <th className="py-2 pr-3">ID</th>
                        <th className="py-2 pr-3">When</th>
                        <th className="py-2 pr-3">Reason</th>
                        <th className="py-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-[var(--color-border)]"
                        >
                          <td className="py-2 pr-3 text-[11px]">{row.id}</td>
                          <td className="py-2 pr-3">
                            {new Date(row.ts).toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 whitespace-pre-wrap">
                            {row.reason}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {row.points > 0 ? `+${row.points}` : row.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
                  No ledger entries yet.
                </div>
              )}
            </Section>
          )}
        </div>

        {/* RIGHT RAIL */}
        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Become a Member</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Unlock posting, city voting, fee waivers, and badges.
            </p>
            {!member ? (
              <BecomeMemberButton
                className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
                label="Activate now – ₹49/mo"
              />
            ) : (
              <span className="mt-2 inline-block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]">
                You’re a member ✅
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Button styles (kept here for clarity; feel free to move to a shared file) */}
      <style>{`
        .btn-solid {
          background: var(--color-accent);
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
        }
        .btn-ghost {
          border: 1px solid var(--color-border);
          color: var(--color-fg);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
        }
        .btn-solid:hover, .btn-ghost:hover { opacity: .95; }
        .btn-solid:focus, .btn-ghost:focus { box-shadow: var(--focus-ring); }
      `}</style>
    </Layout>
  );
}
