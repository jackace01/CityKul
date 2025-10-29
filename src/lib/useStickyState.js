// src/lib/useStickyState.js
import { useEffect, useState } from "react";

/**
 * Persist a small piece of state in localStorage.
 * Namespaced with citykul:* to avoid collisions.
 */
export default function useStickyState(key, initialValue) {
  const storageKey = `citykul:sticky:${key}`;
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [storageKey, state]);

  return [state, setState];
}
