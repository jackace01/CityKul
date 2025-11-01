// src/pages/Promotions.jsx
import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import { getSelectedCity, getSelectedLocality } from "../lib/cityState";
import {
  PROMO_SLOTS,
  computePrice,
  getActivePromotions,
  listMyPromotions,
  submitPromotion,
} from "../lib/api/promotions";

export default function Promotions() {
  const u = getUser();
  const member = isMember();
  const city = getSelectedCity() || u?.city || "Indore";
  const locality = getSelectedLocality() || u?.locality || "";

  const active = useMemo(() => getActivePromotions(city, locality, Date.now()), [city, locality]);

  // --- Simple submit form (member-only) ---
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("Learn more");
  const [ctaHref, setCtaHref] = useState("");
  const [slot, setSlot] = useState("rail");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetCity, setTargetCity] = useState(city);
  const [targetLocality, setTargetLocality] = useState("");

  const price = computePrice({ slot, startDate, endDate });

  const my = useMemo(() => listMyPromotions(u?.email || u?.name || "guest@demo"), [u?.email, u?.name]);

  function onSubmit(e) {
    e.preventDefault();
    try {
      submitPromotion({
        title,
        org,
        description: desc,
        imageUrl,
        ctaText,
        ctaHref,
        slot,
        startDate,
        endDate,
        target: { city: targetCity, locality: targetLocality || "" },
      });
      alert("Submitted for review. Wallet debited.");
      setTitle(""); setOrg(""); setDesc(""); setImageUrl(""); setCtaText("Learn more");
      setCtaHref(""); setSlot("rail"); setStartDate(""); setEndDate("");
      setTargetCity(city); setTargetLocality("");
    } catch (err) {
      alert(err?.message || "Could not submit.");
    }
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Section title="Active Promotions in Your City">
            {active.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {active.map((p, i) => (
                  <Card key={i}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-full aspect-[16/9] object-cover rounded mb-2 ring-1 ring-[var(--color-border)]" />
                    ) : null}
                    <div className="text-xs text-[var(--color-muted)] mb-1">
                      {p.slot?.toUpperCase()} · {p.target?.city}{p?.target?.locality ? ` - ${p.target.locality}` : ""}
                    </div>
                    <h3 className="font-semibold">{p.title}</h3>
                    {p.org ? <div className="text-sm text-[var(--color-muted)]">{p.org}</div> : null}
                    {p.description ? <p className="text-sm mt-1">{p.description}</p> : null}
                    {p.ctaHref || p.ctaText ? (
                      <a
                        href={p.ctaHref || "#"}
                        target={p.ctaHref ? "_blank" : undefined}
                        rel="noreferrer"
                        className="mt-3 inline-block px-3 py-1 rounded bg-[var(--color-accent)] text-white"
                      >
                        {p.ctaText || "Learn more"}
                      </a>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No active promotions right now.</div>
            )}
          </Section>

          <Section title="My Promotions">
            {my.length ? (
              <div className="space-y-2">
                {my.map((p) => (
                  <div key={p._id} className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{p.title}</div>
                        <div className="text-xs text-[var(--color-muted)]">
                          {p.slot?.toUpperCase()} · {p.target?.city}{p?.target?.locality ? ` - ${p.target.locality}` : ""} · {p.startDate} → {p.endDate}
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p._status === "approved" ? "bg-green-600 text-white" : "bg-amber-600 text-white"}`}>
                        {p._status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">You haven’t submitted any promotions yet.</div>
            )}
          </Section>
        </div>

        <div>
          <Section title="Book a Promotion">
            {!member ? (
              <div className="text-sm">
                Only members can submit promotions.{" "}
                <a href="#/membership" className="underline text-[var(--color-accent)]">Become a member</a>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <div className="mb-1">Title</div>
                    <input value={title} onChange={e=>setTitle(e.target.value)} required className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">Organization</div>
                    <input value={org} onChange={e=>setOrg(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                </div>

                <label className="text-sm">
                  <div className="mb-1">Description</div>
                  <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <div className="mb-1">Image URL (optional)</div>
                    <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2" placeholder="https://..." />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">CTA Link (optional)</div>
                    <input value={ctaHref} onChange={e=>setCtaHref(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2" placeholder="https://..." />
                  </label>
                </div>

                <div className="grid sm:grid-cols-[1fr_1fr_1fr] gap-3">
                  <label className="text-sm">
                    <div className="mb-1">Slot</div>
                    <select value={slot} onChange={e=>setSlot(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2">
                      {PROMO_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">Start</div>
                    <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">End</div>
                    <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} required className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <div className="mb-1">Target City</div>
                    <input value={targetCity} onChange={e=>setTargetCity(e.target.value)} required className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">Target Locality (optional)</div>
                    <input value={targetLocality} onChange={e=>setTargetLocality(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2" />
                  </label>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="text-sm">
                    Estimated price: <b>{price}</b> pts
                  </div>
                  <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">
                    Submit for Review
                  </button>
                </div>
              </form>
            )}
          </Section>
        </div>
      </div>
    </Layout>
  );
}
