// src/hooks/useUploader.js
// Super-light client-side “uploader” that just stores selected files as blob URLs.

import { useState } from "react";

export function useUploader() {
  const [items, setItems] = useState([]);

  function add(fileList) {
    const next = [];
    for (const f of Array.from(fileList || [])) {
      // limit to images/videos for now
      const url = URL.createObjectURL(f);
      next.push({ name: f.name, type: f.type, url, size: f.size });
    }
    setItems(prev => [...prev, ...next].slice(0, 6)); // keep first 6
  }

  function clear() {
    setItems([]);
  }

  return { items, add, clear };
}
