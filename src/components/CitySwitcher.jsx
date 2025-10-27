import { useEffect, useMemo, useState } from "react";
import { INDIA_CITIES } from "../lib/indiaCities";
import { getCity, getLocality, setCityLocality } from "../lib/auth";

export default function CitySwitcher({ onClose }) {
  const [city, setCity] = useState(getCity() || "");
  const [locality, setLocality] = useState(getLocality() || "");
  const [qCity, setQCity] = useState("");
  const [qLocality, setQLocality] = useState("");

  const cityOptions = useMemo(() => {
    const base = INDIA_CITIES.map((c) => c.city);
    const q = qCity.trim().toLowerCase();
    return q ? base.filter((x) => x.toLowerCase().includes(q)) : base;
  }, [qCity]);

  const localityOptions = useMemo(() => {
    const match = INDIA_CITIES.find((c) => c.city === city);
    const base = match?.localities || [];
    const q = qLocality.trim().toLowerCase();
    return q ? base.filter((x) => x.toLowerCase().includes(q)) : base;
  }, [city, qLocality]);

  useEffect(() => {
    // reset locality when city changes
    setLocality("");
    setQLocality("");
  }, [city]);

  function save() {
    setCityLocality(city, locality);
    if (onClose) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--color-surface)] text-[var(--color-fg)] ring-1 ring-[var(--color-border)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choose City & Locality</h3>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 grid gap-4">
          {/* City */}
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              value={qCity}
              onChange={(e) => setQCity(e.target.value)}
              placeholder="Search city…"
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white mb-2"
            />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
            >
              <option value="">Select a city</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">Other (type below)</option>
            </select>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Or type city manually…"
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white mt-2"
            />
          </div>

          {/* Locality */}
          <div>
            <label className="block text-sm mb-1">Locality / Neighbourhood</label>
            <input
              value={qLocality}
              onChange={(e) => setQLocality(e.target.value)}
              placeholder="Search locality…"
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white mb-2"
            />
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
            >
              <option value="">Select a locality</option>
              {localityOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              <option value="">Other (type below)</option>
            </select>
            <input
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Or type locality manually…"
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white mt-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-2 rounded bg-[var(--color-accent)] text-white"
              disabled={!city}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
