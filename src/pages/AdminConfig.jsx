// src/pages/AdminConfig.jsx
// Local-only mock admin page: edit per-city economy overrides at runtime.
// Uses your existing economy.js helpers.

import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getSelectedCity, getSelectedLocality, setSelectedCityLocality } from "../lib/cityState";
import { getCityEconomy, setCityEconomyOverride } from "../lib/config/economy";

export default function AdminConfig() {
  const [city, setCity] = useState(getSelectedCity() || "Indore");
  const [locality, setLocality] = useState(getSelectedLocality() || "");

  // Editor (raw JSON override)
  const [raw, setRaw] = useState(JSON.stringify(getOverrideSafe(city), null, 2));
  const [valid, setValid] = useState(true);
  const [msg, setMsg] = useState("");

  // Quick knobs UI
  const eff = useMemo(() => getCityEconomy(city), [city, raw]);
  const [quick, setQuick] = useState(toQuick(eff));

  useEffect(() => {
    setRaw(JSON.stringify(getOverrideSafe(city), null, 2));
    setQuick(toQuick(getCityEconomy(city)));
  }, [city]);

  function getOverrideSafe(c) {
    try {
      const raw = localStorage.getItem(`citykul:economy:overrides:${c || "default"}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function onChangeRaw(text) {
    setRaw(text);
    try {
      if (!text.trim()) {
        setValid(true);
        setMsg("Empty JSON = no override for this city.");
        return;
      }
      JSON.parse(text);
      setValid(true);
      setMsg("");
    } catch (e) {
      setValid(false);
      setMsg(`Invalid JSON: ${e.message}`);
    }
  }

  function saveRaw() {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {};
      setCityEconomyOverride(city, parsed);
      setMsg("Saved overrides.");
    } catch {
      setMsg("Could not save overrides.");
    }
  }

  function clearOverride() {
    try {
      localStorage.removeItem(`citykul:economy:overrides:${city || "default"}`);
      setRaw(JSON.stringify({}, null, 2));
      setMsg("Override cleared for this city.");
    } catch {}
  }

  function applyQuick() {
    const patch = {
      membership: {
        priceINR: num(quick.membershipPriceINR, 100),
        welcomeBonusPts: num(quick.welcomeBonusPts, 50),
      },
      promotions: {
        basePerDay: {
          rail: num(quick.promoRail, 10),
          sidebar: num(quick.promoSidebar, 6),
          card: num(quick.promoCard, 4),
        },
        cityMultiplier: {
          default: num(quick.cityMultDefault, 1.0),
          ...(quick.cityMultCity && isFiniteNum(quick.cityMultValue)
            ? { [quick.cityMultCity.trim()]: Number(quick.cityMultValue) }
            : {}),
        },
      },
      escrow: {
        jobsHoldMultiplier: num(quick.jobsHoldMult, 1.5),
        rentalHoldFixed: num(quick.rentalHoldFixed, 50),
      },
      rewards: {
        reviewVote: num(quick.reviewVote, 0.2),
        postApproved: num(quick.postApproved, 2),
      },
      postingHour: num(quick.postingHour, 23),
      postingMinute: num(quick.postingMinute, 0),
      minWithdrawal: num(quick.minWithdrawal, 100),
    };
    // merge with existing override
    const cur = getOverrideSafe(city) || {};
    const next = deepMerge(cur, patch);
    setCityEconomyOverride(city, next);
    setRaw(JSON.stringify(next, null, 2));
    setMsg("Applied Quick Knobs.");
  }

  function useInApp() {
    setSelectedCityLocality(city, locality || "");
    setMsg("App context updated.");
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Section title="Admin Config — Per City">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm">
                <div className="mb-1">City</div>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2"
                  placeholder="e.g., Indore"
                />
              </label>
              <label className="text-sm">
                <div className="mb-1">Neighbourhood (optional)</div>
                <input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2"
                  placeholder="e.g., Vijay Nagar"
                />
              </label>
              <button onClick={useInApp} className="self-end px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                Use in App
              </button>
            </div>
          </Section>

          <Section title="Quick Knobs (Guided)">
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <div className="text-xs text-[var(--color-muted)]">Membership</div>
                <div className="mt-2 grid gap-2">
                  <label className="text-xs">
                    Price (₹)
                    <input
                      type="number"
                      value={quick.membershipPriceINR}
                      onChange={(e) => setQuick((q) => ({ ...q, membershipPriceINR: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Welcome bonus (pts)
                    <input
                      type="number"
                      value={quick.welcomeBonusPts}
                      onChange={(e) => setQuick((q) => ({ ...q, welcomeBonusPts: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                </div>
              </Card>

              <Card>
                <div className="text-xs text-[var(--color-muted)]">Promotions — Base/day</div>
                <div className="mt-2 grid gap-2">
                  <label className="text-xs">
                    Rail
                    <input
                      type="number"
                      value={quick.promoRail}
                      onChange={(e) => setQuick((q) => ({ ...q, promoRail: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Sidebar
                    <input
                      type="number"
                      value={quick.promoSidebar}
                      onChange={(e) => setQuick((q) => ({ ...q, promoSidebar: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Card
                    <input
                      type="number"
                      value={quick.promoCard}
                      onChange={(e) => setQuick((q) => ({ ...q, promoCard: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                </div>
                <div className="mt-3 text-xs">
                  <div className="font-medium mb-1">City multiplier</div>
                  <div className="grid gap-2">
                    <label className="text-xs">
                      Default ×
                      <input
                        type="number" step="0.1"
                        value={quick.cityMultDefault}
                        onChange={(e) => setQuick((q) => ({ ...q, cityMultDefault: e.target.value }))}
                        className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="City (optional)"
                        value={quick.cityMultCity}
                        onChange={(e) => setQuick((q) => ({ ...q, cityMultCity: e.target.value }))}
                        className="px-2 py-1 rounded ring-1 ring-[var(--color-border)] text-xs"
                      />
                      <input
                        placeholder="Value ×"
                        type="number" step="0.1"
                        value={quick.cityMultValue}
                        onChange={(e) => setQuick((q) => ({ ...q, cityMultValue: e.target.value }))}
                        className="px-2 py-1 rounded ring-1 ring-[var(--color-border)] text-xs"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="text-xs text-[var(--color-muted)]">Escrow & Rewards</div>
                <div className="mt-2 grid gap-2">
                  <label className="text-xs">
                    Jobs hold ×
                    <input
                      type="number" step="0.1"
                      value={quick.jobsHoldMult}
                      onChange={(e) => setQuick((q) => ({ ...q, jobsHoldMult: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Rentals hold (pts)
                    <input
                      type="number"
                      value={quick.rentalHoldFixed}
                      onChange={(e) => setQuick((q) => ({ ...q, rentalHoldFixed: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Review vote reward (pts)
                    <input
                      type="number" step="0.1"
                      value={quick.reviewVote}
                      onChange={(e) => setQuick((q) => ({ ...q, reviewVote: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-xs">
                    Approved post reward (pts)
                    <input
                      type="number"
                      value={quick.postApproved}
                      onChange={(e) => setQuick((q) => ({ ...q, postApproved: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <label>
                    Post hr
                    <input
                      type="number" min={0} max={23}
                      value={quick.postingHour}
                      onChange={(e) => setQuick((q) => ({ ...q, postingHour: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label>
                    Post min
                    <input
                      type="number" min={0} max={59}
                      value={quick.postingMinute}
                      onChange={(e) => setQuick((q) => ({ ...q, postingMinute: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                  <label>
                    Min withdraw
                    <input
                      type="number"
                      value={quick.minWithdrawal}
                      onChange={(e) => setQuick((q) => ({ ...q, minWithdrawal: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    />
                  </label>
                </div>
              </Card>
            </div>

            <div className="mt-3">
              <button onClick={applyQuick} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white text-sm">
                Apply Quick Knobs
              </button>
            </div>
          </Section>

          <Section title="Effective Config (merged)">
            <pre className="text-xs p-3 rounded-xl bg-[var(--color-elev)] ring-1 ring-[var(--color-border)] overflow-auto">
{JSON.stringify(eff, null, 2)}
            </pre>
          </Section>
        </div>

        {/* Right column: JSON editor */}
        <div className="grid gap-6">
          <Section title="City Override (JSON)">
            <textarea
              value={raw}
              onChange={(e) => onChangeRaw(e.target.value)}
              rows={18}
              className={`w-full rounded border px-3 py-2 font-mono text-xs ${
                valid ? "border-[var(--color-border)]" : "border-red-500"
              }`}
            />
            <div className="text-xs text-[var(--color-muted)] mt-1">{msg}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={saveRaw} disabled={!valid} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white text-sm">
                Save Override
              </button>
              <button onClick={clearOverride} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] text-sm">
                Reset City Override
              </button>
            </div>
            <div className="text-[11px] text-[var(--color-muted)] mt-2">
              Stored at key <code>citykul:economy:overrides:{city || "default"}</code>
            </div>
          </Section>

          <Section title="Notes">
            <ul className="text-xs text-[var(--color-muted)] space-y-2">
              <li>Per-city overrides are saved locally in your browser.</li>
              <li>All money/price math should read from <code>getCityEconomy(city)</code>.</li>
              <li>When you write ledger entries, include <code>meta.city</code> so Admin Finance can show city-wise stats.</li>
            </ul>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

// ---- helpers ----
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function isFiniteNum(v){ const n = Number(v); return Number.isFinite(n); }
function deepMerge(base, extra) {
  if (Array.isArray(base)) return [...base];
  if (typeof base !== "object" || base === null) return extra;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    if (typeof extra[k] === "object" && extra[k] && !Array.isArray(extra[k])) {
      out[k] = deepMerge(base[k] || {}, extra[k]);
    } else {
      out[k] = extra[k];
    }
  }
  return out;
}
function toQuick(cfg) {
  return {
    membershipPriceINR: cfg?.membership?.priceINR ?? 100,
    welcomeBonusPts: cfg?.membership?.welcomeBonusPts ?? 50,
    promoRail: cfg?.promotions?.basePerDay?.rail ?? 10,
    promoSidebar: cfg?.promotions?.basePerDay?.sidebar ?? 6,
    promoCard: cfg?.promotions?.basePerDay?.card ?? 4,
    cityMultDefault: cfg?.promotions?.cityMultiplier?.default ?? 1.0,
    cityMultCity: "",
    cityMultValue: "",
    jobsHoldMult: cfg?.escrow?.jobsHoldMultiplier ?? 1.5,
    rentalHoldFixed: cfg?.escrow?.rentalHoldFixed ?? 50,
    reviewVote: cfg?.rewards?.reviewVote ?? 0.2,
    postApproved: cfg?.rewards?.postApproved ?? 2,
    postingHour: cfg?.postingHour ?? 23,
    postingMinute: cfg?.postingMinute ?? 0,
    minWithdrawal: cfg?.minWithdrawal ?? 100,
  };
}
