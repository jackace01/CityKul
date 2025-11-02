// src/pages/AdminTrust.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";

import { getSelectedCity } from "../lib/cityState";
import {
  getWeightsForCity,
  getCityWeightsOverride,
  setCityWeightsOverride,
  patchCityWeightsOverride,
  DEFAULT_WEIGHTS,
} from "../lib/config/weights";

import {
  getReputation,
  setProfessionBaseline,
  setKycFlags,
} from "../lib/reputation";
import { getVoteWeight as getVoteWeightSeparate } from "../lib/voteWeight";
import { isMember } from "../lib/auth";

function Num({ label, value, onChange, step = "0.01", min, max }) {
  return (
    <label className="text-xs">
      {label}
      <input
        type="number"
        step={step}
        {...(min !== undefined ? { min } : {})}
        {...(max !== undefined ? { max } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
      />
    </label>
  );
}

export default function AdminTrust() {
  const [city, setCity] = useState(getSelectedCity() || "Indore");

  // weights editor
  const [raw, setRaw] = useState(JSON.stringify(getCityWeightsOverride(city), null, 2));
  const [valid, setValid] = useState(true);
  const eff = useMemo(() => getWeightsForCity(city), [city, raw]);

  useEffect(() => {
    setRaw(JSON.stringify(getCityWeightsOverride(city), null, 2));
  }, [city]);

  function onChangeRaw(txt) {
    setRaw(txt);
    try { txt.trim() ? JSON.parse(txt) : {}; setValid(true); }
    catch { setValid(false); }
  }
  function saveRaw() {
    try {
      const obj = raw.trim() ? JSON.parse(raw) : {};
      setCityWeightsOverride(city, obj);
      setRaw(JSON.stringify(obj, null, 2));
      alert("Saved Trust weights override for this city.");
    } catch {
      alert("Invalid JSON");
    }
  }
  function resetRaw() {
    setCityWeightsOverride(city, {});
    setRaw(JSON.stringify({}, null, 2));
    alert("Cleared override for this city.");
  }

  // Quick knobs (guided controls)
  const [quick, setQuick] = useState(() => toQuick(getWeightsForCity(city)));
  useEffect(() => { setQuick(toQuick(getWeightsForCity(city))); }, [city, raw]);

  function applyQuick() {
    const patch = {
      rep: {
        baseByProfession: { ...(eff.rep?.baseByProfession || {}), ...(quick.profKey && quick.profVal !== "" ? { [quick.profKey.trim()]: Number(quick.profVal) } : {}) },
        kyc: {
          phoneEmail: num(quick.kycPhoneEmail, DEFAULT_WEIGHTS.rep.kyc.phoneEmail),
          aadhaar: num(quick.kycAadhaar, DEFAULT_WEIGHTS.rep.kyc.aadhaar),
          pan: num(quick.kycPan, DEFAULT_WEIGHTS.rep.kyc.pan),
        },
        profileJobsCompleted: num(quick.repJobsProfile, DEFAULT_WEIGHTS.rep.profileJobsCompleted),
        jobCompleted: num(quick.repJobCompleted, DEFAULT_WEIGHTS.rep.jobCompleted),
        jobDefault: num(quick.repJobDefault, DEFAULT_WEIGHTS.rep.jobDefault),
        misconductReport: num(quick.repMisconduct, DEFAULT_WEIGHTS.rep.misconductReport),
        contributionApproved: num(quick.repContribOk, DEFAULT_WEIGHTS.rep.contributionApproved),
        contributionRejected: num(quick.repContribBad, DEFAULT_WEIGHTS.rep.contributionRejected),
        voteCorrect: num(quick.repVoteCorrect, DEFAULT_WEIGHTS.rep.voteCorrect),
        voteWrong: num(quick.repVoteWrong, DEFAULT_WEIGHTS.rep.voteWrong),
        clamp: { min: num(quick.repMinClamp, 0), max: num(quick.repMaxClamp, 5000) },
      },
      vote: {
        floorFree: num(quick.vwFloorFree, DEFAULT_WEIGHTS.vote.floorFree),
        capFree: num(quick.vwCapFree, DEFAULT_WEIGHTS.vote.capFree),
        capMember: num(quick.vwCapMember, DEFAULT_WEIGHTS.vote.capMember),
        deltaCorrect: num(quick.vwDeltaCorrect, DEFAULT_WEIGHTS.vote.deltaCorrect),
        deltaWrong: num(quick.vwDeltaWrong, DEFAULT_WEIGHTS.vote.deltaWrong),
      },
      stake: {
        percentAtAccept: num(quick.stakePctAccept, DEFAULT_WEIGHTS.stake.percentAtAccept),
        burnOnDefault: num(quick.stakeBurnOnDefault, DEFAULT_WEIGHTS.stake.burnOnDefault),
        bonusOnSuccess: num(quick.stakeBonusOnSuccess, DEFAULT_WEIGHTS.stake.bonusOnSuccess),
      },
      appeals: {
        feeINR: num(quick.appealsFee, DEFAULT_WEIGHTS.appeals.feeINR),
        splitToApp: num(quick.appealsSplitApp, DEFAULT_WEIGHTS.appeals.splitToApp),
        splitToReviewers: num(quick.appealsSplitRevs, DEFAULT_WEIGHTS.appeals.splitToReviewers),
      },
    };
    const next = patchCityWeightsOverride(city, patch);
    setRaw(JSON.stringify(next, null, 2));
    alert("Applied Trust quick knobs.");
  }

  // User-level preview & tools
  const [userId, setUserId] = useState("guest@demo");
  const [profession, setProfession] = useState("");
  const [kycPhoneEmail, setKycPhoneEmail] = useState(false);
  const [kycAadhaar, setKycAadhaar] = useState(false);
  const [kycPan, setKycPan] = useState(false);
  const member = isMember();

  const rep = useMemo(() => getReputation(userId, city), [userId, city, raw, kycPhoneEmail, kycAadhaar, kycPan, profession]);
  const vw = useMemo(() => getVoteWeightSeparate(userId, city, member), [userId, city, member, raw]);

  function applyUserTweaks() {
    if (profession?.trim()) setProfessionBaseline(userId, city, profession.trim());
    setKycFlags(userId, { phoneEmail: kycPhoneEmail, aadhaar: kycAadhaar, pan: kycPan });
    alert("Saved user Trust attributes (local only).");
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Section title="Trust & Weights — Per City">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="text-sm">
                <div className="mb-1">City</div>
                <input value={city} onChange={(e)=>setCity(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
              </label>
              <div className="self-end text-xs text-[var(--color-muted)]">Overrides key: <code>citykul:weights:overrides:{(city||"default")}</code></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 mt-3">
              <Card>
                <div className="font-semibold text-sm mb-2">Reputation</div>
                <div className="grid gap-2">
                  <Num label="Jobs profile +rep" value={quick.repJobsProfile} onChange={v=>setQuick(q=>({...q, repJobsProfile: v}))} />
                  <Num label="Job completed +rep" value={quick.repJobCompleted} onChange={v=>setQuick(q=>({...q, repJobCompleted: v}))} />
                  <Num label="Job default −rep" value={quick.repJobDefault} onChange={v=>setQuick(q=>({...q, repJobDefault: v}))} />
                  <Num label="Misconduct −rep" value={quick.repMisconduct} onChange={v=>setQuick(q=>({...q, repMisconduct: v}))} />
                  <Num label="Contribution OK +rep" value={quick.repContribOk} onChange={v=>setQuick(q=>({...q, repContribOk: v}))} />
                  <Num label="Contribution Rejected −rep" value={quick.repContribBad} onChange={v=>setQuick(q=>({...q, repContribBad: v}))} />
                  <Num label="Vote correct +rep" value={quick.repVoteCorrect} onChange={v=>setQuick(q=>({...q, repVoteCorrect: v}))} />
                  <Num label="Vote wrong −rep" value={quick.repVoteWrong} onChange={v=>setQuick(q=>({...q, repVoteWrong: v}))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Num label="Clamp min" value={quick.repMinClamp} onChange={v=>setQuick(q=>({...q, repMinClamp: v}))} />
                    <Num label="Clamp max" value={quick.repMaxClamp} onChange={v=>setQuick(q=>({...q, repMaxClamp: v}))} />
                  </div>
                </div>
                <div className="mt-3 text-xs">
                  <div className="font-medium">KYC Bonuses</div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Num label="Phone/Email" value={quick.kycPhoneEmail} step="0.01" onChange={v=>setQuick(q=>({...q, kycPhoneEmail: v}))} />
                    <Num label="Aadhaar" value={quick.kycAadhaar} step="0.01" onChange={v=>setQuick(q=>({...q, kycAadhaar: v}))} />
                    <Num label="PAN" value={quick.kycPan} step="0.01" onChange={v=>setQuick(q=>({...q, kycPan: v}))} />
                  </div>
                </div>
                <div className="mt-3 text-xs">
                  <div className="font-medium mb-1">Profession Baseline</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Profession key (e.g., Teacher)" value={quick.profKey} onChange={e=>setQuick(q=>({...q, profKey: e.target.value}))} className="px-2 py-1 rounded ring-1 ring-[var(--color-border)]" />
                    <input placeholder="Value (e.g., 1.2)" type="number" step="0.01" value={quick.profVal} onChange={e=>setQuick(q=>({...q, profVal: e.target.value}))} className="px-2 py-1 rounded ring-1 ring-[var(--color-border)]" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="font-semibold text-sm mb-2">Vote-Weight</div>
                <div className="grid gap-2">
                  <Num label="Floor (free)" value={quick.vwFloorFree} onChange={v=>setQuick(q=>({...q, vwFloorFree: v}))} />
                  <Num label="Cap (free)" value={quick.vwCapFree} onChange={v=>setQuick(q=>({...q, vwCapFree: v}))} />
                  <Num label="Cap (member)" value={quick.vwCapMember} onChange={v=>setQuick(q=>({...q, vwCapMember: v}))} />
                  <Num label="Δ correct" value={quick.vwDeltaCorrect} onChange={v=>setQuick(q=>({...q, vwDeltaCorrect: v}))} />
                  <Num label="Δ wrong" value={quick.vwDeltaWrong} onChange={v=>setQuick(q=>({...q, vwDeltaWrong: v}))} />
                </div>

                <div className="font-semibold text-sm mt-4 mb-2">Stake Policy (Jobs)</div>
                <div className="grid gap-2">
                  <Num label="% at accept" value={quick.stakePctAccept} onChange={v=>setQuick(q=>({...q, stakePctAccept: v}))} />
                  <Num label="Burn on default" value={quick.stakeBurnOnDefault} onChange={v=>setQuick(q=>({...q, stakeBurnOnDefault: v}))} />
                  <Num label="Bonus on success" value={quick.stakeBonusOnSuccess} onChange={v=>setQuick(q=>({...q, stakeBonusOnSuccess: v}))} />
                </div>

                <div className="font-semibold text-sm mt-4 mb-2">Appeals</div>
                <div className="grid gap-2">
                  <Num label="Fee (₹)" value={quick.appealsFee} step="1" onChange={v=>setQuick(q=>({...q, appealsFee: v}))} />
                  <Num label="Split to App" value={quick.appealsSplitApp} onChange={v=>setQuick(q=>({...q, appealsSplitApp: v}))} />
                  <Num label="Split to Reviewers" value={quick.appealsSplitRevs} onChange={v=>setQuick(q=>({...q, appealsSplitRevs: v}))} />
                </div>
              </Card>

              <Card>
                <div className="font-semibold text-sm mb-2">User Preview</div>
                <div className="grid gap-2">
                  <label className="text-xs">User ID / email
                    <input value={userId} onChange={(e)=>setUserId(e.target.value)} className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]" />
                  </label>
                  <label className="text-xs">Profession
                    <input value={profession} onChange={(e)=>setProfession(e.target.value)} className="w-full mt-1 px-2 py-1 rounded ring-1 ring-[var(--color-border)]" />
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={kycPhoneEmail} onChange={e=>setKycPhoneEmail(e.target.checked)} /> Phone/Email</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={kycAadhaar} onChange={e=>setKycAadhaar(e.target.checked)} /> Aadhaar</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={kycPan} onChange={e=>setKycPan(e.target.checked)} /> PAN</label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
                      <div className="text-xs text-[var(--color-muted)]">Reputation</div>
                      <div className="text-xl font-semibold">{rep.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
                      <div className="text-xs text-[var(--color-muted)]">Vote-Weight</div>
                      <div className="text-xl font-semibold">{vw.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button onClick={applyQuick} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white text-sm">Apply Quick Knobs</button>
                    <button onClick={applyUserTweaks} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm">Save User Attributes</button>
                  </div>
                </div>
              </Card>
            </div>
          </Section>

          <Section title="Effective Trust Weights (merged)">
            <pre className="text-xs p-3 rounded-xl bg-[var(--color-elev)] ring-1 ring-[var(--color-border)] overflow-auto">
{JSON.stringify(eff, null, 2)}
            </pre>
          </Section>
        </div>

        {/* Right: raw JSON editor */}
        <div className="grid gap-6">
          <Section title="City Weights Override (JSON)">
            <textarea
              value={raw}
              onChange={(e)=>onChangeRaw(e.target.value)}
              rows={22}
              className={`w-full rounded border px-3 py-2 font-mono text-xs ${valid ? "border-[var(--color-border)]" : "border-red-500"}`}
            />
            <div className="mt-2 flex gap-2">
              <button onClick={saveRaw} disabled={!valid} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white text-sm">Save Override</button>
              <button onClick={resetRaw} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] text-sm">Reset City Override</button>
            </div>
            <div className="text-[11px] text-[var(--color-muted)] mt-2">
              Use this to paste/export configurations across cities.
            </div>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

// helpers
function num(v, d){ const n = Number(v); return Number.isFinite(n) ? n : d; }
function toQuick(w) {
  const d = DEFAULT_WEIGHTS;
  return {
    // rep
    repJobsProfile: w?.rep?.profileJobsCompleted ?? d.rep.profileJobsCompleted,
    repJobCompleted: w?.rep?.jobCompleted ?? d.rep.jobCompleted,
    repJobDefault: w?.rep?.jobDefault ?? d.rep.jobDefault,
    repMisconduct: w?.rep?.misconductReport ?? d.rep.misconductReport,
    repContribOk: w?.rep?.contributionApproved ?? d.rep.contributionApproved,
    repContribBad: w?.rep?.contributionRejected ?? d.rep.contributionRejected,
    repVoteCorrect: w?.rep?.voteCorrect ?? d.rep.voteCorrect,
    repVoteWrong: w?.rep?.voteWrong ?? d.rep.voteWrong,
    repMinClamp: w?.rep?.clamp?.min ?? d.rep.clamp.min,
    repMaxClamp: w?.rep?.clamp?.max ?? d.rep.clamp.max,
    kycPhoneEmail: w?.rep?.kyc?.phoneEmail ?? d.rep.kyc.phoneEmail,
    kycAadhaar: w?.rep?.kyc?.aadhaar ?? d.rep.kyc.aadhaar,
    kycPan: w?.rep?.kyc?.pan ?? d.rep.kyc.pan,
    profKey: "",
    profVal: "",
    // vote
    vwFloorFree: w?.vote?.floorFree ?? d.vote.floorFree,
    vwCapFree: w?.vote?.capFree ?? d.vote.capFree,
    vwCapMember: w?.vote?.capMember ?? d.vote.capMember,
    vwDeltaCorrect: w?.vote?.deltaCorrect ?? d.vote.deltaCorrect,
    vwDeltaWrong: w?.vote?.deltaWrong ?? d.vote.deltaWrong,
    // stake
    stakePctAccept: w?.stake?.percentAtAccept ?? d.stake.percentAtAccept,
    stakeBurnOnDefault: w?.stake?.burnOnDefault ?? d.stake.burnOnDefault,
    stakeBonusOnSuccess: w?.stake?.bonusOnSuccess ?? d.stake.bonusOnSuccess,
    // appeals
    appealsFee: w?.appeals?.feeINR ?? d.appeals.feeINR,
    appealsSplitApp: w?.appeals?.splitToApp ?? d.appeals.splitToApp,
    appealsSplitRevs: w?.appeals?.splitToReviewers ?? d.appeals.splitToReviewers,
  };
}
