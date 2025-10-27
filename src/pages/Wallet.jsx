import { useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import { getBalance, getLedger, ensureDemoWallet } from "../lib/api/wallet";
import BecomeMemberButton from "../components/BecomeMemberButton";

export default function Wallet() {
  const u = getUser();
  const uid = u?.email || "guest@demo";
  const member = isMember();

  // Seed demo wallet ONCE per user (prevents reseeding on each render)
  useEffect(() => {
    if (uid) ensureDemoWallet(uid, member);
  }, [uid, member]);

  const balance = useMemo(() => getBalance(uid), [uid]);
  const ledger = useMemo(() => getLedger(uid), [uid]);

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Wallet & Earnings">
            <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="text-sm text-[var(--color-muted)]">Current Balance</div>
              <div className="text-3xl font-bold mt-1">₹ {Number(balance || 0).toLocaleString()}</div>

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

          {/* Helpful info */}
          <Section title="How to Earn More">
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Post local events, jobs, marketplace deals that get approved.</li>
              <li>Verify others’ submissions accurately.</li>
              <li>Keep your posts complete: clear title, timing, photos, and short video.</li>
              <li>Engage with your city: answer questions, help newcomers.</li>
            </ul>

            <div className="mt-3 text-sm text-[var(--color-muted)]">
              Withdrawals are mock-only right now. We’ll wire this to payouts later.
            </div>
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
