// src/components/CitySwitcher.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSelectedCity,
  getSelectedLocality,
  setSelectedCityLocality,
  getRecentCities,
} from "../lib/cityState";
import { searchCities, searchLocalities } from "../lib/geo";

export default function CitySwitcher({ onClose }) {
  const [tab, setTab] = useState("search"); // 'search' | 'manual'
  const [city, setCity] = useState(getSelectedCity() || "");
  const [locality, setLocality] = useState(getSelectedLocality() || "");

  // Search inputs
  const [qCity, setQCity] = useState("");
  const [qLoc, setQLoc] = useState("");

  const [cityResults, setCityResults] = useState([]);
  const [locResults, setLocResults] = useState([]);
  const [busyCity, setBusyCity] = useState(false);
  const [busyLoc, setBusyLoc] = useState(false);

  const cityMetaRef = useRef({ state: "", country: "" });

  // Debounce helpers
  useEffect(() => {
    if (!qCity || qCity.trim().length < 2) {
      setCityResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setBusyCity(true);
        const res = await searchCities(qCity.trim());
        setCityResults(res);
      } catch {
        setCityResults([]);
      } finally {
        setBusyCity(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qCity]);

  useEffect(() => {
    if (!qLoc || qLoc.trim().length < 2 || !city) {
      setLocResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setBusyLoc(true);
        const res = await searchLocalities(city, qLoc.trim());
        setLocResults(res);
      } catch {
        setLocResults([]);
      } finally {
        setBusyLoc(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qLoc, city]);

  function chooseCity(item) {
    setCity(item.city || item.displayName || "");
    cityMetaRef.current = { state: item.state || "", country: item.country || "" };
    // Reset locality query/results when city changes via picker
    setLocality("");
    setQLoc("");
    setLocResults([]);
  }

  function chooseLocality(item) {
    setLocality(item.locality || item.displayName || "");
  }

  function save() {
    setSelectedCityLocality(city, locality, cityMetaRef.current);
    if (onClose) onClose();
  }

  const recents = getRecentCities();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--color-surface)] text-[var(--color-fg)] ring-1 ring-[var(--color-border)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Choose City & Neighbourhood</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded ring-1 ring-[var(--color-border)]">✕</button>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded ${tab === "search" ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
            onClick={() => setTab("search")}
          >
            Search Worldwide
          </button>
          <button
            className={`px-3 py-1 rounded ${tab === "manual" ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
            onClick={() => setTab("manual")}
          >
            Enter Manually
          </button>
        </div>

        {/* Recents */}
        {!!recents.length && (
          <div className="mt-3">
            <div className="text-xs text-[var(--color-muted)] mb-1">Recent</div>
            <div className="flex flex-wrap gap-2">
              {recents.map((r, i) => (
                <button
                  key={`${r.city}-${r.locality}-${i}`}
                  onClick={() => { setCity(r.city); setLocality(r.locality || ""); cityMetaRef.current = { state: r.state || "", country: r.country || "" }; }}
                  className="px-2 py-1 rounded-full text-xs ring-1 ring-[var(--color-border)]"
                  title={[r.locality, r.city, r.state, r.country].filter(Boolean).join(", ")}
                >
                  {r.locality ? `${r.locality} · ${r.city}` : r.city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === "search" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* City search */}
            <div>
              <label className="block text-sm mb-1">Find a city anywhere</label>
              <input
                value={qCity}
                onChange={(e) => setQCity(e.target.value)}
                placeholder="Type city name (e.g., Indore, London, Tokyo)…"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
              <div className="mt-2 max-h-48 overflow-auto rounded border border-[var(--color-border)]">
                {busyCity ? (
                  <div className="p-2 text-xs text-[var(--color-muted)]">Searching…</div>
                ) : cityResults.length ? (
                  cityResults.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => chooseCity(c)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--color-elev)]"
                    >
                      <div className="text-sm font-medium">{c.city || c.displayName}</div>
                      <div className="text-[11px] text-[var(--color-muted)]">
                        {[c.state, c.country].filter(Boolean).join(", ")}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-xs text-[var(--color-muted)]">No results yet.</div>
                )}
              </div>
            </div>

            {/* Locality search */}
            <div>
              <label className="block text-sm mb-1">
                Find a neighbourhood <span className="text-[var(--color-muted)]">(optional)</span>
              </label>
              <input
                value={qLoc}
                onChange={(e) => setQLoc(e.target.value)}
                placeholder={city ? `Type neighbourhood in ${city}…` : "Select a city first…"}
                disabled={!city}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white disabled:opacity-60"
              />
              <div className="mt-2 max-h-48 overflow-auto rounded border border-[var(--color-border)]">
                {busyLoc ? (
                  <div className="p-2 text-xs text-[var(--color-muted)]">Searching…</div>
                ) : locResults.length ? (
                  locResults.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => chooseLocality(l)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--color-elev)]"
                    >
                      <div className="text-sm font-medium">{l.locality || l.displayName}</div>
                      <div className="text-[11px] text-[var(--color-muted)]">
                        {[l.city || city, l.state, l.country].filter(Boolean).join(", ")}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-xs text-[var(--color-muted)]">No results yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MANUAL TAB */}
        {tab === "manual" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">City (type anything)</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City name"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Neighbourhood (optional)</label>
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="Area, suburb, block, ward…"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Current selection & actions */}
        <div className="mt-4 rounded-xl ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-elev)]">
          <div className="text-xs text-[var(--color-muted)]">Selected</div>
          <div className="text-sm font-medium">
            {locality ? `${locality} · ` : ""}{city || "—"}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Cancel</button>
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
  );
}
