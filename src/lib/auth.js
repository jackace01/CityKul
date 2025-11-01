// src/lib/auth.js
// Lightweight auth + profile + membership state (with CityKul keys + legacy migration)
import { loadJSON, saveJSON } from "./storage";

const KEY_USER = "citykul:user";        // legacy was "rezylo:user"
const KEY_CITY = "citykul:city";
const KEY_LOCALITY = "citykul:locality";

// ---------- internal event helpers ----------
const USER_EVENT = "citykul:user-change";
function emitUserChange() {
  window.dispatchEvent(new Event(USER_EVENT));
}
export function subscribeUser(callback) {
  function handler() {
    callback(getUser());
  }
  window.addEventListener(USER_EVENT, handler);
  return () => window.removeEventListener(USER_EVENT, handler);
}

// ---------- core getters/setters ----------
export function getUser() {
  return loadJSON(KEY_USER, null);
}
export function setUser(u) {
  // Ensure homeCity is preserved (fixed at signup), default to existing city if missing
  const prev = getUser();
  const next = {
    ...prev,
    ...u,
  };
  if (!next.homeCity) {
    next.homeCity = next.homeCity || prev?.homeCity || next.city || "";
  }
  saveJSON(KEY_USER, next || null);
  if (next?.city) localStorage.setItem(KEY_CITY, next.city);
  if (next?.locality !== undefined) localStorage.setItem(KEY_LOCALITY, next.locality || "");
  emitUserChange();
}

// Sign out (keeps city/locality so header switcher still works when logged out)
export function signOut() {
  try {
    localStorage.removeItem(KEY_USER);
  } finally {
    emitUserChange();
  }
}

// Back-compat
export function clearUser() {
  return signOut();
}

export function isMember() {
  const u = getUser();
  return !!u?.member;
}

// ---------- city/locality ----------
export function setCityLocality(city, locality = "") {
  if (city) localStorage.setItem(KEY_CITY, city);
  localStorage.setItem(KEY_LOCALITY, locality || "");
  const u = getUser();
  if (u) {
    setUser({ ...u, city: city || u.city, locality: locality ?? u.locality });
  } else {
    emitUserChange();
  }
}
export function getCity() {
  return localStorage.getItem(KEY_CITY) || getUser()?.city || "";
}
export function getLocality() {
  return localStorage.getItem(KEY_LOCALITY) || getUser()?.locality || "";
}

// ---------- demo helpers ----------
export function demoSignIn(partial = {}) {
  const nowCity = partial.city || "Indore";
  const user = {
    name: partial.name || "Citizen",
    email: partial.email || `user-${Date.now()}@demo.local`,
    phone: partial.phone || "",
    // Both set on first sign-in; homeCity is the residency anchor.
    homeCity: partial.homeCity || nowCity,
    city: nowCity,
    locality: partial.locality || "Vijay Nagar",
    profession: partial.profession || "",
    member: !!partial.member,
    gov: !!partial.gov,
    since: Date.now(),
    avatar: partial.avatar || "",
    bio: partial.bio || ""
  };
  setUser(user);
  return user;
}

// Upgrade to member
export function upgradeToMember() {
  const u = getUser();
  if (!u) return;
  setUser({ ...u, member: true });
}

// ---------- util ----------
export function initialsFromName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}
