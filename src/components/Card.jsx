export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] shadow-[var(--shadow-md)] ${className}`}
    >
      <div className="p-4 text-[var(--color-fg)]">{children}</div>
    </div>
  );
}
