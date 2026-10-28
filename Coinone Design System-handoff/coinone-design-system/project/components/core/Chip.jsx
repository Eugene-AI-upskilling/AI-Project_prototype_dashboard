import React from "react";

/**
 * Coinone Chip — filter / toggle chip. White with hairline border by default;
 * active state gains a near-black border + bold weight (no fill change).
 */
export function Chip({ children, active = false, onClick, style = {}, ...rest }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    fontSize: "var(--text-body)",
    fontFamily: "var(--font-sans)",
    background: "var(--color-surface)",
    color: "var(--color-foreground)",
    border: `1px solid ${active ? "var(--ink-900)" : "var(--color-hairline)"}`,
    borderRadius: "var(--radius-chip)",
    fontWeight: active ? "var(--weight-bold)" : "var(--weight-medium)",
    cursor: "pointer",
    transition: "border-color var(--dur-micro) var(--ease-out), background var(--dur-micro) var(--ease-out)",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...base, ...style }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-surface-tint)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface)"; }}
      {...rest}
    >
      {children}
    </button>
  );
}
