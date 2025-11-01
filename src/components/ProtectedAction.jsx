// src/components/ProtectedAction.jsx
import React, { useState } from "react";
import AccessModal from "./AccessModal";

/**
 * Wrap any clickable child to guard an action.
 * guardFn() -> { ok: boolean, reason?: "subscribe"|"resident"|string }
 *
 * <ProtectedAction guardFn={canReviewOrVote} onAllowed={handleSubmit}>
 *   <button>Submit</button>
 * </ProtectedAction>
 */
export default function ProtectedAction({ guardFn, onAllowed, reasonOverride, children }) {
  const [modal, setModal] = useState(null); // "subscribe" | "resident" | string | null

  function onClick(e) {
    e?.preventDefault?.();
    try {
      const res = typeof guardFn === "function" ? guardFn() : { ok: true };
      if (res.ok) {
        onAllowed?.(e);
      } else {
        setModal(reasonOverride || res.reason || "subscribe");
      }
    } catch {
      setModal("subscribe");
    }
  }

  const child = React.Children.only(children);
  const withHandler = React.cloneElement(child, { onClick });

  return (
    <>
      {withHandler}
      <AccessModal open={!!modal} reason={modal || "subscribe"} onClose={() => setModal(null)} />
    </>
  );
}
