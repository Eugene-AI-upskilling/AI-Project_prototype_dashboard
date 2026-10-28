import React from "react";

/**
 * Coinone Card — flat white surface with a hairline border and 8px radius.
 * Low elevation by default; pass elevated for the soft floating-menu shadow.
 * Optional title / right-aligned action header.
 */
export function Card({
  children,
  title,
  action,
  elevated = false,
  padding = 20,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: elevated ? "var(--shadow-soft)" : "none",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `14px ${padding}px`,
            borderBottom: "1px solid var(--color-hairline)",
          }}
        >
          <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-foreground)" }}>
            {title}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
