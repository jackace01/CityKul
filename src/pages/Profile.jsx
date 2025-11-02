// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, setUser, isMember } from "../lib/auth";
import { upsertPublicUser, getProfile, seedDirectoryIfEmpty } from "../lib/api/users";
import { Link } from "react-router-dom";

// NEW: trust metrics
import { getReputation, setProfessionBaseline, setKycFlags, setJobsProfileCompleted } from "../lib/reputation";
import { getVoteWeight as getVoteWeightSeparate } from "../lib/voteWeight";

export default function Profile() {
  const me = getUser();
  const myId = me?.email || "guest@demo";
  const member = isMember();
  const city = me?.city || "Indore";

  // ensure directory exists (safe no-op if already seeded)
  useEffect(() => { seedDirectoryIfEmpty(); }, []);

  const existing = getProfile(myId) || {
    id: myId,
    name: me?.name || "",
    city: me?.city || "",
    locality: me?.locality || "",
    occupation: me?.profession || "",
    bio: "",
  };

  const [name, setName] = useState(existing.name);
  const [cityState, setCityState] = useState(existing.city);
  const [locality, setLocality] = useState(existing.locality);
  const [occupation, setOccupation] = useState(existing.occupation);
  const [bio, setBio] = useState(existing.bio);

  // Trust metrics
  const rep = useMemo(() => getReputation(myId, cityState || city || "Indore"), [myId, cityState, city]);
  const vw = useMemo(() => getVoteWeightSeparate(myId, cityState || city || "Indore", member), [myId, cityState, city, member]);

  function saveProfile() {
    setUser({ ...(me || {}), name, city: cityState, locality, profession: occupation });
    upsertPublicUser({ id: myId, name, city: cityState, locality, occupation, bio });

    // Optional hooks (no UI yet): record declared profession baseline and jobs profile completion
    if (occupation) setProfessionBaseline(myId, cityState || city || "Indore", occupation);
    setJobsProfileCompleted(myId, cityState || city || "Indore", true);

    alert("Profile saved.");
  }

  return (
    <Section title="My Profile">
      <Card>
        <div className="grid gap-3 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Public profile</h3>
            <div className="flex items-center gap-2">
              <Link to={`/user/${encodeURIComponent(myId)}`} className="text-sm px-3 py-1 rounded ring-1 ring-[var(--color-border)]">View as public →</Link>
              <Link to="/admin-notices" className="text-sm px-3 py-1 rounded bg-[var(--color-accent)] text-white" title="Open Government Notice Board – Admin">Admin Notices</Link>
            </div>
          </div>

          {/* Trust snapshot */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
              <div className="text-xs text-[var(--color-muted)]">Reputation</div>
              <div className="text-xl font-semibold">{rep.toFixed(2)}</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">KYC & job success improve this</div>
            </div>
            <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
              <div className="text-xs text-[var(--color-muted)]">Vote Weight</div>
              <div className="text-xl font-semibold">{vw.toFixed(2)}</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Accuracy in reviews improves this</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white" />
            </div>
            <div>
              <label className="block text-sm mb-1">Occupation</label>
              <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">City</label>
              <input value={cityState} onChange={(e) => setCityState(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white" />
            </div>
            <div>
              <label className="block text-sm mb-1">Locality</label>
              <input value={locality} onChange={(e) => setLocality(e.target.value)} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Bio (public)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white" placeholder="Tell people what you do and what you care about locally." />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={saveProfile} className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Save</button>
            <Link to="/settings" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm">Settings</Link>
          </div>
        </div>
      </Card>

      <h3 className="text-lg font-semibold mt-6 mb-2">Badges & contributions</h3>
      <div className="flex gap-2 flex-wrap">
        {["Contributor","Validator","Top Helper"].map((b)=>(
          <span key={b} className="px-3 py-1 rounded-full border border-[var(--color-border)] text-sm">{b}</span>
        ))}
      </div>
    </Section>
  );
}
