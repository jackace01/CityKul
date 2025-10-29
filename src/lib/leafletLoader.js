// src/lib/leafletLoader.js
// Lightweight loader for Leaflet via CDN (no npm install).
const CSS_ID = "leaflet-css-cdn";
const JS_ID  = "leaflet-js-cdn";

export function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.L) return resolve(window.L);

    // CSS
    if (!document.getElementById(CSS_ID)) {
      const link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }
    // JS
    if (document.getElementById(JS_ID)) {
      const check = () => (window.L ? resolve(window.L) : setTimeout(check, 50));
      return check();
    }
    const script = document.createElement("script");
    script.id = JS_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-o9N1j7kGIC3rjV+gGkSLSQkN1Sxv1H5f2GZ8XG0E0XQ=";
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}
