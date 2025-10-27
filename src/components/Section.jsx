import { Link } from "react-router-dom";

export default function Section({ title, rightHref, rightText, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl bg-[var(--color-surface)] text-[var(--color-fg)] ring-1 ring-[var(--color-border)] shadow ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-base md:text-lg font-semibold tracking-tight">{title}</h2>
        {rightHref && rightText ? (
          <Link to={rightHref} className="text-sm text-[var(--color-accent)] hover:underline">
            {rightText}
          </Link>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
