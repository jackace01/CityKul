// src/components/RatingBars.jsx
// Tiny visual for rating distributions (1..5). Pure CSS, no deps.
export default function RatingBars({
  buckets = {1:0,2:0,3:0,4:0,5:0},
  total = 0,
  title = "Ratings",
  compact = false
}) {
  const order = [5,4,3,2,1]; // show 5★ first like most sites
  const max = Math.max(1, ...order.map(k => buckets[k] || 0));
  return (
    <div>
      {title ? <div className="font-semibold mb-2">{title}</div> : null}
      <div className="space-y-1">
        {order.map((star) => {
          const count = buckets[star] || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const widthPct = Math.max(4, Math.round((count / max) * 100)); // relative bar
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <div className="w-10 tabular-nums">{star}★</div>
              <div
                className="flex-1 h-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden"
                aria-hidden
              >
                <div
                  className="h-full bg-[var(--color-accent)]/80"
                  style={{
                    width: `${widthPct}%`,
                    transition: `width var(--duration-base) var(--easing)`,
                  }}
                  aria-label={`${star} stars ${pct}%`}
                />
              </div>
              <div className="w-10 text-right tabular-nums text-[12px] text-[var(--color-muted)]">{count}</div>
            </div>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-1 text-[11px] text-[var(--color-muted)]">
          Total {total} rating{total === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}
