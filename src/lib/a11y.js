// Small accessibility helpers

import { useEffect } from "react";

/** Adds a .using-keyboard class to <body> when Tab navigation is detected */
export function useFocusVisibleClass() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Tab") document.body.classList.add("using-keyboard");
    };
    const onMouse = () => document.body.classList.remove("using-keyboard");
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
    };
  }, []);
}

/** Returns true if user prefers reduced motion (read once; no SSR issues) */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
