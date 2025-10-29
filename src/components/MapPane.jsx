// src/components/MapPane.jsx
import { useEffect, useRef, useState } from "react";
import { loadLeaflet } from "../lib/leafletLoader";

/**
 * Props:
 * - markers: [{ id, name, lat, lng, href, address?, locality?, city? }]
 * - fitBoundsPadding?: number
 * - onMarkerClick?: (marker) => void
 *
 * Behavior:
 * - If a marker lacks {lat,lng} but has address/locality/city, we auto-geocode via Nominatim.
 * - Results are cached in localStorage (keyed by a normalized address string).
 * - Requests are serialized (~1/sec) to be polite to the free OSM endpoint.
 */

const CACHE_KEY = "citykul:geocode:cache:v1";

// ----- small helpers -----
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveCache(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}
function norm(s = "") {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function buildQuery(m) {
  const parts = [
    m.address || "",
    m.locality || "",
    m.city || "",
  ]
    .map((x) => (x || "").trim())
    .filter(Boolean);

  if (!parts.length && (m.name || "").trim()) {
    parts.push(m.name);
    if (m.city) parts.push(m.city);
  }
  const q = parts.join(", ");
  return q || ""; // empty => no geocode
}

async function geocodeOne(query, signal) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}&countrycodes=in`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept-Language": "en",
      "Referer": "https://citykul.com/",
    },
    signal,
  });
  if (!res.ok) throw new Error(`Geocode failed ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data) && data.length) {
    const { lat, lon } = data[0];
    return { lat: Number(lat), lng: Number(lon) };
  }
  return null;
}

export default function MapPane({
  markers = [],
  fitBoundsPadding = 60,
  onMarkerClick,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const [resolved, setResolved] = useState([]);
  const [status, setStatus] = useState({ pending: 0, done: 0 });

  // 1) Resolve coordinates
  useEffect(() => {
    let destroyed = false;
    const abort = new AbortController();
    const cache = loadCache();

    async function run() {
      const withCoords = [];
      const toGeocode = [];

      markers.forEach((m) => {
        if (typeof m.lat === "number" && typeof m.lng === "number") {
          withCoords.push(m);
          return;
        }
        const q = buildQuery(m);
        if (!q) return;
        const key = norm(q);
        if (cache[key]?.lat && cache[key]?.lng) {
          withCoords.push({ ...m, lat: cache[key].lat, lng: cache[key].lng });
        } else {
          toGeocode.push({ marker: m, key, query: q });
        }
      });

      if (!destroyed) {
        setResolved(withCoords);
        setStatus({ pending: toGeocode.length, done: 0 });
      }

      for (let i = 0; i < toGeocode.length; i++) {
        if (destroyed) break;

        const { marker, key, query } = toGeocode[i];
        try {
          if (i > 0) await new Promise((r) => setTimeout(r, 1100));
          const loc = await geocodeOne(query, abort.signal);
          if (loc) {
            cache[key] = loc;
            saveCache(cache);
            if (!destroyed) {
              setResolved((prev) => [...prev, { ...marker, ...loc }]);
            }
          }
        } catch {
          // ignore
        } finally {
          if (!destroyed) {
            setStatus((s) => ({ pending: Math.max(0, s.pending - 1), done: s.done + 1 }));
          }
        }
      }
    }

    run();
    return () => {
      destroyed = true;
      abort.abort();
    };
  }, [markers]);

  // 2) Create/Update map
  useEffect(() => {
    let destroyed = false;
    let L;

    async function draw() {
      L = await loadLeaflet();
      if (destroyed) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      layerRef.current = L.layerGroup().addTo(mapRef.current);

      const pts = [];
      resolved.forEach((m) => {
        if (typeof m.lat !== "number" || typeof m.lng !== "number") return;
        const mark = L.marker([m.lat, m.lng]).addTo(layerRef.current);
        const label = `<b>${String(m.name || "Item").slice(0, 120).replace(/</g, "&lt;")}</b>`;
        mark.bindPopup(label);
        mark.on("click", () => {
          if (onMarkerClick) onMarkerClick(m);
          else if (m.href) window.history.pushState({}, "", m.href);
        });
        pts.push([m.lat, m.lng]);
      });

      if (pts.length) {
        const bounds = L.latLngBounds(pts);
        mapRef.current.fitBounds(bounds, { padding: [fitBoundsPadding, fitBoundsPadding] });
      } else {
        mapRef.current.setView([22.9734, 78.6569], 5);
      }
    }

    draw();
    return () => {
      destroyed = true;
    };
  }, [resolved, fitBoundsPadding, onMarkerClick]);

  return (
    <div className="w-full">
      {status.pending > 0 ? (
        <div className="mb-2 text-[11px] text-[var(--color-muted)]">
          Geocoding {status.pending} place(s)… (cached: {resolved.length})
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="w-full h-[60vh] rounded-[var(--radius-xl)] ring-1 ring-[var(--map-ring)]"
        role="region"
        aria-label="Map showing items on the page"
        tabIndex={0}
      />
    </div>
  );
}
