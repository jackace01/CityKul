// src/lib/cityState.js
// Selected city/locality (can differ from user's profile). Emits change events.
// Now includes "recents" to make switching quick.

const KEY_CITY = "citykul:selectedCity";
const KEY_LOC = "citykul:selectedLocality";
const KEY_RECENTS = "citykul:recentCities"; // [{city, locality, country?, state?}...]
const EVT = "citykul:selected-city-change";

export function getSelectedCity() {
  return localStorage.getItem(KEY_CITY) || "";
}
export function getSelectedLocality() {
  return localStorage.getItem(KEY_LOC) || "";
}

export function getRecentCities() {
  try {
    const raw = localStorage.getItem(KEY_RECENTS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecent(entry) {
  const rec = getRecentCities().filter(
    (r) => (r.city || "").toLowerCase() !== (entry.city || "").toLowerCase() ||
           (r.locality || "")?.toLowerCase() !== (entry.locality || "")?.toLowerCase()
  );
  rec.unshift({
    city: entry.city || "",
    locality: entry.locality || "",
    state: entry.state || "",
    country: entry.country || "",
  });
  const trimmed = rec.slice(0, 8);
  localStorage.setItem(KEY_RECENTS, JSON.stringify(trimmed));
}

export function setSelectedCityLocality(city, locality = "", meta = {}) {
  if (city) localStorage.setItem(KEY_CITY, city);
  localStorage.setItem(KEY_LOC, locality || "");
  // save to recents (with optional state/country if provided)
  pushRecent({
    city,
    locality: locality || "",
    state: meta.state || "",
    country: meta.country || "",
  });
  window.dispatchEvent(new Event(EVT));
}

export function subscribeSelectedCity(cb) {
  function handler() {
    cb({ city: getSelectedCity(), locality: getSelectedLocality() });
  }
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

// Bootstrap once with user city if empty
(function bootstrap() {
  try {
    const cur = getSelectedCity();
    if (!cur) {
      const authRaw = localStorage.getItem("citykul:user");
      if (authRaw) {
        const u = JSON.parse(authRaw);
        if (u?.city) setSelectedCityLocality(u.city, u.locality || "", { state: u.state || "", country: u.country || "" });
      }
    }
  } catch {}
})();
