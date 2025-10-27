import React from "react";
import { upgradeToMember, getUser } from "../lib/auth";
import { addPoints, ensureDemoWallet } from "../lib/api/wallet";

/**
 * One-tap membership:
 * - upgrades user to member
 * - ensures wallet exists
 * - adds a 100pt welcome bonus (safe to call repeatedly)
 */
export default function BecomeMemberButton({
  className = "px-3 py-1 rounded bg-[var(--color-accent)] text-white",
  label = "Become a member",
  onDone,
}) {
  function handleClick() {
    upgradeToMember();
    const u = getUser();
    const uid = u?.email || "guest@demo";
    ensureDemoWallet(uid, true);
    addPoints(uid, 100, "Membership activated (welcome bonus)");
    alert("You're a member now! 🎉 A 100pt welcome bonus was added to your wallet.");
    if (onDone) onDone();
  }

  return (
    <button onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
