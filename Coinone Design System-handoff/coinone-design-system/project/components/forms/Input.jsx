import React from "react";

/**
 * Coinone Input — labeled text field with optional helper / error. Hairline
 * border, 8px radius; focus ring uses the accent outline blue; error state
 * turns the border + helper red.
 */
export function Input({
  label,
  helper,
  error,
  id,
  suffix,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? `cn-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const [focused, setFocused] = React.useState(false);
  const borderColor = error
    ? "var(--danger)"
    : focused
    ? "var(--color-accent-outline)"
    : "var(--color-hairline)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: "var(--text-micro)", fontWeight: "var(--weight-semibold)", color: "var(--color-body)" }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 46,
          padding: "0 14px",
          background: "var(--color-surface)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused && !error ? "0 0 0 3px rgba(23,114,248,0.12)" : "none",
          transition: "border-color var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out)",
        }}
      >
        <input
          id={inputId}
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
          {...rest}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-control)",
            color: "var(--color-foreground)",
            minWidth: 0,
          }}
        />
        {suffix && <span style={{ fontSize: "var(--text-body)", color: "var(--color-muted)", marginLeft: 8 }}>{suffix}</span>}
      </div>
      {(helper || error) && (
        <span style={{ fontSize: "var(--text-micro)", color: error ? "var(--danger)" : "var(--color-muted)" }}>
          {error || helper}
        </span>
      )}
    </div>
  );
}
