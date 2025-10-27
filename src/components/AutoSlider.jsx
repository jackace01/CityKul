import { useEffect, useRef, useState } from "react";

export default function AutoSlider({ items = [], interval = 2600, height = 200, className = "", render }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!items.length) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => clearInterval(timer.current);
  }, [items.length, interval]);

  return (
    <div
      className={`relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 overflow-hidden ${className}`}
      style={{ height }}
    >
      {items.length > 0 && <div className="text-[var(--color-fg)]">{render(items[index])}</div>}
      <div className="flex gap-1 absolute right-4 bottom-3">
        {items.map((_, i) => (
          <span
            key={i}
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              i === index ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
