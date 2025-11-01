// src/lib/geo.js
// Lightweight client-side geocoding via OpenStreetMap Nominatim.
// NOTE: Public service; be respectful (debounce requests).

const BASE = "https://nominatim.openstreetmap.org/search";

async function nominatimSearch(q, extra = {}) {
  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(extra.limit || 10),
  });
  if (extra.countrycodes) params.set("countrycodes", extra.countrycodes);
  if (extra.viewbox) params.set("viewbox", extra.viewbox);
  if (extra.bounded) params.set("bounded", extra.bounded ? "1" : "0");

  const resp = await fetch(`${BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error("Geo lookup failed");
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

function normalizePlace(item) {
  const a = item.address || {};
  const cityLike =
    a.city || a.town || a.village || a.municipality || a.county || a.state_district || a.state;
  const localityLike =
    a.neighbourhood || a.suburb || a.city_district || a.quarter || a.hamlet || "";

  return {
    displayName: item.display_name,
    city: cityLike || "",
    locality: localityLike || "",
    state: a.state || "",
    country: a.country || "",
    lat: item.lat,
    lon: item.lon,
    type: item.type,
  };
}

export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const list = await nominatimSearch(query, { limit: 10 });
  // Keep only city-like results
  const cityTypes = new Set(["city", "town", "village", "municipality", "county", "state"]);
  return list
    .filter((x) => cityTypes.has(x.type))
    .map(normalizePlace)
    .slice(0, 10);
}

export async function searchLocalities(cityName, query) {
  if (!query || query.trim().length < 2) return [];
  // Bias the search by appending city name
  const list = await nominatimSearch(`${query}, ${cityName}`, { limit: 12 });
  const locTypes = new Set([
    "neighbourhood",
    "suburb",
    "city_district",
    "quarter",
    "hamlet",
    "residential",
  ]);
  return list
    .filter((x) => locTypes.has(x.type))
    .map(normalizePlace)
    .slice(0, 12);
}
