// src/components/CityGuardBanner.jsx
import React, { useEffect, useState } from "react";
import { getUser } from "../lib/auth";
import { getSelectedCity, getSelectedLocality, subscribeSelectedCity } from "../lib/cityState";

export default function CityGuardBanner() {
  const [sel, setSel] = useState({ city: getSelectedCity(), locality: getSelectedLocality() });
  const u = getUser();
  const home = u?.homeCity || u?.city || "";
  const explorer = home && sel.city && home !== sel.city;

  useEffect(() => {
    const unsub = subscribeSelectedCity(setSel);
    return unsub;
  }, []);

  if (!sel.city) return null;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="max-w-6xl mx-auto px-4 py-2 text-xs flex items-center justify-between">
        <div>
          <span className="font-medium">Viewing:</span> {sel.city}
          {sel.locality ? ` · ${sel.locality}` : ""}
          {explorer ? (
            <span className="ml-2 px-2 py-[2px] rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/40">
              Explorer Mode
            </span>
          ) : (
            <span className="ml-2 px-2 py-[2px] rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-400/40">
              Resident
            </span>
          )}
        </div>
        <div className="text-[var(--color-muted)]">
          {explorer ? "Posting is limited to home city" : "You can post and vote here"}
        </div>
      </div>
    </div>
  );
}
