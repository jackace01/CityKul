// src/components/MapEmbed.jsx
import React from "react";

export default function MapEmbed({ query = "" }) {
  const q = encodeURIComponent(query || "");
  const url = `https://www.google.com/maps?q=${q}&output=embed`;
  return (
    <div className="w-full h-56 rounded-xl overflow-hidden ring-1 ring-[var(--color-border)]">
      <iframe
        title="map"
        src={url}
        className="w-full h-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
