// src/components/StatusPill.jsx
export default function StatusPill({ status = "" }) {
  const cls = {
    created: "ring-1 ring-[var(--color-border)] text-[11px] px-2 py-[2px] rounded-full",
    paid_hold: "bg-[var(--status-paid-bg)] text-[var(--status-paid-fg)] text-[11px] px-2 py-[2px] rounded-full",
    accepted: "bg-[var(--status-accepted-bg)] text-[var(--status-accepted-fg)] text-[11px] px-2 py-[2px] rounded-full",
    in_use: "bg-[var(--status-inuse-bg)] text-[var(--status-inuse-fg)] text-[11px] px-2 py-[2px] rounded-full",
    returned: "bg-[var(--status-returned-bg)] text-[var(--status-returned-fg)] text-[11px] px-2 py-[2px] rounded-full",
    completed: "bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)] text-[11px] px-2 py-[2px] rounded-full",
    canceled: "bg-[var(--status-canceled-bg)] text-[var(--status-canceled-fg)] text-[11px] px-2 py-[2px] rounded-full",
    disputed: "bg-[var(--status-disputed-bg)] text-[var(--status-disputed-fg)] text-[11px] px-2 py-[2px] rounded-full",
  }[status] || "ring-1 ring-[var(--color-border)] text-[11px] px-2 py-[2px] rounded-full";

  return <span className={cls}>{status}</span>;
}
