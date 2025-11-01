// src/pages/Membership.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, setUser, isMember } from "../lib/auth";
import { useEffect, useMemo, useState } from "react";
import {
  getPlans,
  getActive,
  isActiveMember,
  getRemainingDays,
  grantTrialIfEligible,
  activatePlan,
  cancelAutoRenewNoteOnly,
  getWalletInfo,
} from "../lib/subscriptions";
import { useNavigate } from "react-router-dom";

function Stat({ label, value, muted }) {
  return (
    <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-surface)]">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className={`mt-1 ${muted ? "text-[var(--color-muted)]" : "font-semibold"}`}>{value}</div>
    </div>
  );
}

export default function Membership() {
  const nav = useNavigate();
  const [u, setU] = useState(getUser());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const active = useMemo(() => getActive(u), [u]);
  const member = isActiveMember();
  const daysLeft = getRemainingDays();
  const plans = getPlans();
  const wallet = getWalletInfo();

  useEffect(() => {
    // Optional: auto-grant one-time 7-day trial for new users (idempotent)
    // Comment out if you don't want trials by default.
    grantTrialIfEligible();
    setU(getUser());
  }, []);

  function onActivate(planId) {
    setErr("");
    setBusy(true);
    try {
      const nextUser = activatePlan(planId);
      setU(nextUser);
      alert("Membership updated! (wallet payment successful)");
      nav("/home");
    } catch (e) {
      setErr(e?.message || "Could not activate plan.");
    } finally {
      setBusy(false);
    }
  }

  function onCancelNote() {
    cancelAutoRenewNoteOnly();
    alert("Auto-renew disabled (note-only in mock). Your plan will expire at the end of the term.");
  }

  const currentPlanName = active
    ? (plans.find(p => p.id === active.planId)?.name || "Member")
    : (u?.member ? (u?.memberPlan || "Member") : "Free");

  return (
    <Layout>
      <Section title="Subscriptions — Plans & Paywall">
        {/* Top summary cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Current plan" value={currentPlanName} />
          <Stat
            label="Status"
            value={member ? `Active (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : "Free / Expired"}
            muted={!member}
          />
          <Stat label="Wallet balance" value={`${wallet.balance} pts`} />
          <Stat
            label="Expires on"
            value={
              active
                ? new Date(active.until).toLocaleDateString()
                : "—"
            }
            muted={!active}
          />
        </div>

        {err ? (
          <div className="mt-3 p-3 rounded bg-red-600/10 text-red-700 dark:text-red-300 text-sm">
            {err}
          </div>
        ) : null}

        {/* Plan chooser */}
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          {plans.map((p) => {
            const isCurrent = active?.planId === p.id;
            const ctaText = isCurrent
              ? "Renew"
              : member
                ? `Switch to ${p.name}`
                : `Activate ${p.name}`;

            return (
              <div key={p.id} className="rounded-xl ring-1 ring-[var(--color-border)] p-4 bg-[var(--color-surface)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{p.durationDays} days</div>
                  </div>
                  <div className="text-lg font-semibold">{p.pricePts} pts / year</div>
                </div>

                <ul className="list-disc pl-5 text-sm space-y-1 mt-3">
                  {p.perks.map((x, i) => <li key={i}>{x}</li>)}
                </ul>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() => onActivate(p.id)}
                    className="px-4 py-2 rounded bg-[var(--color-accent)] text-white disabled:opacity-60"
                  >
                    {busy ? "Processing..." : ctaText}
                  </button>
                  {isCurrent ? (
                    <button
                      type="button"
                      className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] text-sm"
                      onClick={onCancelNote}
                      disabled={busy}
                      title="Disable auto-renewal (note-only in mock)"
                    >
                      Disable Auto-Renew
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes & FAQs for clarity */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl ring-1 ring-[var(--color-border)] p-4 bg-[var(--color-surface)]">
            <div className="font-semibold">How payments work (mock)</div>
            <p className="text-sm text-[var(--color-muted)] mt-2">
              Plan activation deducts points from your wallet and credits the Platform Wallet. In production this would be a real online payment (Razorpay/UPI) and the wallet updated accordingly.
            </p>
          </div>
          <div className="rounded-xl ring-1 ring-[var(--color-border)] p-4 bg-[var(--color-surface)]">
            <div className="font-semibold">Trials & Renewal</div>
            <p className="text-sm text-[var(--color-muted)] mt-2">
              New users get a one-time 7-day Member trial. Renewing before expiry extends your plan from the existing expiry date.
            </p>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
