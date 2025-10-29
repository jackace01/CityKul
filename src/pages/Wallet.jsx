// src/pages/Wallet.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import { getBalance, getLedger, ensureDemoWallet, deposit, withdraw, getUserHolds } from "../lib/api/wallet";
import BecomeMemberButton from "../components/BecomeMemberButton";

export default function Wallet() {
  const u = getUser();
  const uid = u?.email || u?.name || "guest@demo";
  const member = isMember();

  useEffect(() => {
    if (uid) ensureDemoWallet(uid, member);
  }, [uid, member]);

  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  const balance = useMemo(() => getBalance(uid), [uid, tick]);
  const ledger = useMemo(() => getLedger(uid), [uid, tick]);
  const holds = useMemo(() => getUserHolds(uid), [uid, tick]);

  function onTopUp() {
    try { deposit(uid, 100, "Top-up (demo)"); bump(); }
    catch { alert("Top-up failed"); }
  }
  function onWithdraw() {
    try { withdraw(uid, 50, "Cash-out (demo)"); bump(); }
    catch (e) { alert(e.message || "Withdraw failed"); }
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Wallet & Earnings">
            <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="text-sm text-[var(--color-muted)]">Current Balance</div>
              <div className="text-3xl font-bold mt-1">₹ {Number(balance || 0).toLocaleString()}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={onTopUp} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">+ ₹100 (demo)</button>
                <button onClick={onWithdraw} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Withdraw ₹50</button>
              </div>

              {!member ? (
                <div className="mt-3 text-sm">
                  You’re on a free plan. Become a member to start posting and earning.
                  <div className="mt-2">
                    <BecomeMemberButton label="Become a member →" />
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-[var(--color-muted)]">
                  Earn points for approved posts, verifications, and helpful activity.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold mb-2">Earning History</div>
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
                      {ledger.map((row) => (
                        <tr key={row.id} className="border-t border-[var(--color-border)]">
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
                  No earnings yet. Participate to start earning!
                </div>
              )}
            </div>
          </Section>

          {/* Holds */}
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
                      <tr key={i} className="border-t border-[var(--color-border)]">
                        <td className="py-2 pr-3">{h.orderId}</td>
                        <td className="py-2 pr-3">{h.fromId === uid ? "Renter (payer)" : "Owner (payee)"}</td>
                        <td className="py-2 pr-3">₹ {Number(h.amount || 0).toLocaleString()}</td>
                        <td className="py-2 pr-3">{h.status}</td>
                        <td className="py-2">{new Date(h.ts || h.releasedAt || h.refundedAt || Date.now()).toLocaleString()}</td>
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

        {/* Right rail promo */}
        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Become a Member</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Unlock posting, earn points, and get a blue tick.
            </p>
            {!member ? (
              <BecomeMemberButton
                className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
                label="Activate now – ₹100"
              />
            ) : (
              <span className="mt-2 inline-block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]">
                You’re a member ✅
              </span>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
