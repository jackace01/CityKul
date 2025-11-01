// src/pages/CityHeroLegacy.jsx
import { useMemo } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { listWinners } from "../lib/api/cityHero";

export default function CityHeroLegacy() {
  const u = getUser();
  const city = u?.city || localStorage.getItem("citykul:city") || "Indore";
  const winners = useMemo(() => listWinners(city, 120), [city]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Section title="Legacy City Heroes">
          {winners.length === 0 ? (
            <div className="text-sm text-[var(--color-muted)]">No winners archived yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {winners.map(w => (
                <Card key={`${w.id}-${w.monthKey}`}>
                  <div className="flex gap-3">
                    {w.photoUrl ? <img src={w.photoUrl} alt="" className="w-20 h-20 rounded object-cover" /> : null}
                    <div className="min-w-0">
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-[var(--color-muted)]">{w.monthKey}</div>
                      {w.bio ? <div className="text-sm mt-1 line-clamp-4">{w.bio}</div> : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Layout>
  );
}
