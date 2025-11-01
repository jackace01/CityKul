// src/pages/CityHero.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import {
  submitHero, listNominees, voteHero,
  ensureHeroMonthlyRollup, getCurrentLeader, listWinners,
  reportHero, heroReportQuorum
} from "../lib/api/cityHero";

export default function CityHero() {
  const u = getUser();
  const member = isMember();
  const city = u?.city || localStorage.getItem("citykul:city") || "Indore";

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => { try { ensureHeroMonthlyRollup(city); } catch {} }, [city]);

  const nominees = useMemo(() => listNominees(city), [city, tick]);
  const leader = useMemo(() => getCurrentLeader(city), [city, tick]);
  const winners = useMemo(() => listWinners(city, 12), [city, tick]);
  const quorum = useMemo(() => heroReportQuorum(city), [city, tick]);

  function onSubmit(e) {
    e.preventDefault();
    if (!member) return alert("Become a member to submit a City Hero.");
    if (!name.trim()) return alert("Name is required.");
    try {
      submitHero({ city, name: name.trim(), bio: bio.trim(), photoUrl: photoUrl.trim() });
      setName(""); setBio(""); setPhotoUrl("");
      alert("Submitted! People in your city can now vote.");
      refresh();
    } catch (err) {
      alert(err.message || "Could not submit.");
    }
  }

  function onVote(id) {
    try {
      voteHero({ city, heroId: id });
      refresh();
    } catch (e) { alert(e.message || "Vote failed"); }
  }

  function onReport(id) {
    const reason = prompt("Why is this fake/duplicate? (short)");
    if (reason === null) return;
    try {
      const rec = reportHero({ city, heroId: id, reason: reason || "fake" });
      alert(`Report filed.\nReview item: ${rec?.id || "(local)"}`);
      refresh();
    } catch (e) {
      alert(e.message || "Could not file report");
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <Section title="City Hero of the Month">
            <div className="rounded-xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-sm text-[var(--color-muted)]">
                Nominate your city’s achievers. Subscribers vote all month; top entry is auto-featured on the 1st.
              </div>

              <div className="mt-3">
                {leader ? (
                  <Card>
                    <div className="text-xs text-[var(--color-muted)]">Current Leader</div>
                    <div className="mt-1 flex gap-3">
                      {leader.photoUrl ? <img src={leader.photoUrl} alt="" className="w-24 h-24 object-cover rounded" /> : null}
                      <div className="min-w-0">
                        <div className="font-semibold">{leader.name}</div>
                        {leader.bio ? <div className="text-sm mt-1 line-clamp-3">{leader.bio}</div> : null}
                        <div className="mt-2 text-xs text-[var(--color-muted)]">Votes: {leader.voteCount || 0}</div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="text-sm text-[var(--color-muted)]">No nominees yet. Be the first!</div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Nominees (This Month)">
            {nominees.length === 0 ? (
              <div className="text-sm text-[var(--color-muted)]">Nothing yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {nominees.map(n => (
                  <Card key={n.id}>
                    <div className="flex gap-3">
                      {n.photoUrl ? <img src={n.photoUrl} alt="" className="w-20 h-20 object-cover rounded" /> : null}
                      <div className="min-w-0">
                        <div className="font-semibold">{n.name}</div>
                        {n.bio ? <div className="text-sm mt-0.5 line-clamp-3">{n.bio}</div> : null}
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => onVote(n.id)} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Vote</button>
                          <button onClick={() => onReport(n.id)} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Report fake</button>
                          <span className="text-xs text-[var(--color-muted)] ml-auto">Votes: {n.voteCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Nominate a Hero">
            {!member ? (
              <div className="text-sm">Only members can submit nominations.</div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-2">
                <input
                  value={name}
                  onChange={e=>setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  required
                />
                <input
                  value={photoUrl}
                  onChange={e=>setPhotoUrl(e.target.value)}
                  placeholder="Photo URL (optional)"
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                />
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e=>setBio(e.target.value)}
                  placeholder="Short bio & why they’re a hero"
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                />
                <div className="text-right">
                  <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Submit</button>
                </div>
              </form>
            )}
          </Section>

          <Section title="Reports & Quorum">
            <div className="text-xs text-[var(--color-muted)] leading-relaxed">
              Fake/duplicate reports go to a reviewer panel with a dynamic quorum.
              <div className="mt-2">
                Needed weight: <b>{quorum?.neededWeight ?? "-"}</b> of total <b>{quorum?.totalWeight ?? "-"}</b> (
                target {Math.round((quorum?.targetPercent || 0)*100)}%).
              </div>
            </div>
          </Section>

          <Section title="Legacy Heroes">
            {winners.length === 0 ? (
              <div className="text-sm text-[var(--color-muted)]">No past winners yet.</div>
            ) : (
              <div className="space-y-2">
                {winners.map(w => (
                  <div key={`${w.id}-${w.monthKey}`} className="flex items-center gap-2">
                    {w.photoUrl ? <img src={w.photoUrl} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-[var(--color-elev)]" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{w.name}</div>
                      <div className="text-[11px] text-[var(--color-muted)]">{w.monthKey}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </Layout>
  );
}
