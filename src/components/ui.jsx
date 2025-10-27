import { createContext, useContext, useMemo, useState } from "react";

/* --------- primitives --------- */
export function Button({ as: Tag = "button", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition";
  const style =
    "bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed";
  return <Tag className={`${base} ${style} ${className}`} {...props} />;
}

export function ButtonGhost({ className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium";
  const style = "ring-1 ring-[var(--color-border)] bg-[var(--color-surface)]";
  return <button className={`${base} ${style} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }) {
  const base =
    "w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white";
  return <input className={`${base} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  const base =
    "w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white";
  return (
    <select className={`${base} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }) {
  const base =
    "w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white";
  return <textarea className={`${base} ${className}`} {...props} />;
}

export function Badge({ children, className = "" }) {
  return (
    <span className={`px-2 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs ${className}`}>
      {children}
    </span>
  );
}

/* --------- toasts --------- */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const api = useMemo(
    () => ({
      show: (msg) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((t) => [...t, { id, msg }]);
        setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== id));
        }, 2400);
      },
    }),
    []
  );
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-md bg-[var(--color-surface)] text-[var(--color-fg)] ring-1 ring-[var(--color-border)] px-3 py-2 shadow"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
