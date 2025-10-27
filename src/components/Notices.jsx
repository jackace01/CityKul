import AutoSlider from "@/components/AutoSlider";

export default function Notices({ items }) {
  const top = (items || []).slice(0, 5);
  return (
    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">Government Notice Board</div>
        <div className="h-2 w-2 rounded-full bg-red-500"></div>
      </div>
      <AutoSlider
        items={top}
        interval={3200}
        height={180}
        className="border-t border-[var(--color-border)] rounded-b-2xl"
        render={(n) => (
          <div className="space-y-2">
            <div className="text-base font-medium">{n.text}</div>
            <div className="text-xs text-[var(--color-muted)]">— {n.by}</div>
            <div className="text-xs text-[var(--color-muted)]">{n.date}</div>
          </div>
        )}
      />
    </div>
  );
}
