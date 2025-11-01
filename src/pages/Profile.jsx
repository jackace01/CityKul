// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, setUser } from "../lib/auth";
import { upsertPublicUser, getProfile, seedDirectoryIfEmpty } from "../lib/api/users";
import { Link } from "react-router-dom";

export default function Profile() {
  const me = getUser();
  const myId = me?.email || "guest@demo";

  // ensure directory exists (safe no-op if already seeded)
  useEffect(() => {
    seedDirectoryIfEmpty();
  }, []);

  const existing = getProfile(myId) || {
    id: myId,
    name: me?.name || "",
    city: me?.city || "",
    locality: me?.locality || "",
    occupation: me?.profession || "",
    bio: "",
  };

  const [name, setName] = useState(existing.name);
  const [city, setCity] = useState(existing.city);
  const [locality, setLocality] = useState(existing.locality);
  const [occupation, setOccupation] = useState(existing.occupation);
  const [bio, setBio] = useState(existing.bio);

  function saveProfile() {
    // keep auth profile city/locality/name roughly in sync
    setUser({ ...(me || {}), name, city, locality, profession: occupation });

    upsertPublicUser({
      id: myId,
      name,
      city,
      locality,
      occupation,
      bio,
    });

    alert("Profile saved.");
  }

  return (
    <Section title="My Profile">
      <Card>
        <div className="grid gap-3 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Public profile</h3>
            <div className="flex items-center gap-2">
              <Link
                to={`/user/${encodeURIComponent(myId)}`}
                className="text-sm px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
              >
                View as public →
              </Link>
              <Link
                to="/admin-notices"
                className="text-sm px-3 py-1 rounded bg-[var(--color-accent)] text-white"
                title="Open Government Notice Board – Admin"
              >
                Admin Notices
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Occupation</label>
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Locality</label>
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Bio (public)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="Tell people what you do and what you care about locally."
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={saveProfile} className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">
              Save
            </button>
            <Link
              to="/settings"
              className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm"
            >
              Settings
            </Link>
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
