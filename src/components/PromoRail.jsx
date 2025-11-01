// src/components/PromoRail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { getSelectedCity, getSelectedLocality, subscribeSelectedCity } from "../lib/cityState";
import { getActivePromotions } from "../lib/api/promotions";
import AutoSlider from "./AutoSlider";

function PromoCard({ p }) {
  return (
    <div className="rounded-lg p-3 ring-1 ring-[var(--color-border)] bg-[var(--color-bg)]/60">
      {p.imageUrl ? (
        <img
          src={p.imageUrl}
          alt=""
          className="w-full aspect-[16/9] object-cover rounded mb-2 ring-1 ring-[var(--color-border)]"
        />
      ) : null}
      <div className="text-sm font-semibold">{p.title}</div>
      {p.org ? <div className="text-[11px] text-[var(--color-muted)]">{p.org}</div> : null}
      {p.description ? (
        <div className="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">{p.description}</div>
      ) : null}
      {p.ctaHref || p.ctaText ? (
        <a
          href={p.ctaHref || "#"}
          target={p.ctaHref ? "_blank" : undefined}
          rel="noreferrer"
          className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
        >
          {p.ctaText || "Learn more"}
        </a>
      ) : null}
    </div>
  );
}

export default function PromoRail() {
  const member = isMember();
  const u = getUser();

  const [selCity, setSelCity] = useState(getSelectedCity());
  const [selLoc, setSelLoc] = useState(getSelectedLocality());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeSelectedCity(({ city, locality }) => {
      setSelCity(city);
      setSelLoc(locality);
      setTick(t => t + 1);
    });
    return () => unsub();
  }, []);

  const promos = useMemo(
    () => (selCity ? getActivePromotions(selCity, selLoc, Date.now()) : []),
    [selCity, selLoc, tick]
  );

  // Separate top "rail" promos (slideshow) from the rest (sidebar cards)
  const rail = promos.filter(p => (p.slot || "rail") === "rail").slice(0, 6);
  const sidebar = promos.filter(p => (p.slot || "rail") !== "rail").slice(0, 6);

  return (
    <aside className="space-y-3">
      {/* Top sponsored rail (sliding) */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
        <div className="text-sm font-semibold mb-2">Sponsored</div>
        {rail.length ? (
          <AutoSlider
            items={rail}
            interval={3500}
            height={180}
            className="rounded-xl"
            render={(p) => <PromoCard p={p} />}
          />
        ) : (
          <div className="text-xs text-[var(--color-muted)]">No active sponsors right now.</div>
        )}
      </div>

      {/* Sidebar mini-cards */}
      {sidebar.length ? (
        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
          <div className="text-sm font-semibold mb-2">More from your city</div>
          <div className="space-y-2">
            {sidebar.map((p, i) => <PromoCard key={i} p={p} />)}
          </div>
        </div>
      ) : null}

      {/* CTA to promote */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
        <div className="text-sm font-semibold">Promote your business</div>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Get seen across CityKul in {selCity || (u?.city || "your city")}.
        </p>
        {member ? (
          <Link
            to="/promotions"
            className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
          >
            + Book a promotion
          </Link>
        ) : (
          <Link
            to="/membership"
            className="mt-2 inline-block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
          >
            Become a member
          </Link>
        )}
      </div>
    </aside>
  );
}
