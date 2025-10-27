import { useEffect, useMemo, useRef, useState } from "react";

export default function Carousel({ items = [], renderItem, interval = 3500, height = "h-44" }) {
  const [i, setI] = useState(0);
  const size = items.length;
  const timer = useRef(null);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  useEffect(() => {
    if (!size) return;
    timer.current = setInterval(() => setI((v) => (v + 1) % size), interval);
    return () => clearInterval(timer.current);
  }, [size, interval]);

  if (!size)
    return (
      <div className={`flex items-center justify-center ${height} text-sm text-[var(--color-muted)]`}>
        No data
      </div>
    );

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${height} bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]`}
    >
      <div className="whitespace-nowrap transition-transform duration-700" style={{ transform: `translateX(-${i * 100}%)` }}>
        {safeItems.map((it, idx) => (
          <div key={idx} className="inline-block w-full h-full align-top">
            <div className="w-full h-full p-4 text-[var(--color-fg)]">{renderItem(it)}</div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
        {safeItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-2 w-2 rounded-full ${idx === i ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
            aria-label={`slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
