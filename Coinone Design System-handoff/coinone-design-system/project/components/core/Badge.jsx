import React from "react";

/**
 * Coinone Badge — small status / label pill. tone sets the color; "up"/"down"
 * follow KR trading convention (up=red, down=blue). Flat, quiet, no shadow.
 */
export function Badge({ children, tone = "neutral", style = {}, ...rest }) {
  const tones = {
    neutral: { background: "var(--color-surface-tint)", color: "var(--ink-800)" },
    brand: { background: "rgba(11,89,213,0.1)", color: "var(--color-primary)" },
    point: { background: "rgba(0,144,255,0.12)", color: "#0077d0" },
    up: { background: "rgba(224,52,75,0.1)", color: "var(--price-up)" },
    down: { background: "rgba(11,89,213,0.1)", color: "var(--price-down)" },
    muted: { background: "transparent", color: "var(--color-muted)", border: "1px solid var(--color-hairline)" },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
        padding: "0 8px",
        fontSize: "var(--text-micro)",
        fontWeight: "var(--weight-bold)",
        lineHeight: 1,
        borderRadius: "var(--radius-sm)",
        fontVariantNumeric: "tabular-nums",
        ...t,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
