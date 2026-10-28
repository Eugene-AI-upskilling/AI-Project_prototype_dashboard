import React from "react";

/**
 * Coinone Button — one filled-blue primary per view; outline/ghost for the rest.
 * Variants: primary (filled #0B59D5), secondary (white + hairline border),
 * accent (transparent + #1772F8 outline), text (link), store / store-dark.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button",
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { height: 36, padding: "0 14px", font: "var(--text-body)" },
    md: { height: 46, padding: "0 18px", font: "var(--text-control)" },
    lg: { height: 49, padding: "0 22px", font: "var(--text-control)" },
  };
  const s = sizes[size] || sizes.md;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    height: s.height,
    padding: s.padding,
    fontSize: s.font,
    fontFamily: "var(--font-sans)",
    lineHeight: 1,
    border: "1px solid transparent",
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    width: fullWidth ? "100%" : "auto",
    transition: "background var(--dur-micro) var(--ease-out), border-color var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out)",
    whiteSpace: "nowrap",
  };

  const variants = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
      fontWeight: "var(--weight-bold)",
    },
    secondary: {
      background: "var(--color-surface)",
      color: "var(--color-foreground)",
      borderColor: "var(--color-hairline)",
      fontWeight: "var(--weight-medium)",
    },
    accent: {
      background: "transparent",
      color: "var(--color-accent-outline)",
      borderColor: "var(--color-accent-outline)",
      borderRadius: "var(--radius-sm)",
      fontWeight: "var(--weight-bold)",
      height: 24,
      padding: "0 8px",
      fontSize: "var(--text-micro)",
    },
    text: {
      background: "transparent",
      color: "var(--color-primary)",
      fontWeight: "var(--weight-regular)",
      fontSize: "var(--text-link)",
      height: "auto",
      padding: 0,
    },
    store: {
      background: "var(--color-surface-tint)",
      color: "var(--color-foreground)",
      borderRadius: "var(--radius-lg)",
      fontWeight: "var(--weight-bold)",
      fontSize: "13px",
      height: 48,
      padding: "0 16px",
    },
    "store-dark": {
      background: "var(--ink-900)",
      color: "var(--white)",
      borderRadius: "var(--radius-lg)",
      fontWeight: "var(--weight-bold)",
      fontSize: "13px",
      height: 48,
      padding: "0 16px",
    },
  };

  const disabledStyle = disabled
    ? {
        background: variant === "primary" ? "var(--color-disabled)" : base.background,
        color: "var(--color-muted)",
        borderColor: variant === "secondary" ? "var(--color-hairline)" : "transparent",
        opacity: variant === "primary" ? 1 : 0.55,
      }
    : {};

  const v = variants[variant] || variants.primary;

  const onEnter = (e) => {
    if (disabled) return;
    if (variant === "primary") e.currentTarget.style.background = "var(--color-primary-hover)";
    else if (variant === "secondary") e.currentTarget.style.background = "var(--color-surface-tint)";
    else if (variant === "accent" || variant === "text") e.currentTarget.style.opacity = "0.78";
    else if (variant === "store") e.currentTarget.style.background = "#e1e8ef";
    else if (variant === "store-dark") e.currentTarget.style.background = "#17181b";
  };
  const onLeave = (e) => {
    if (disabled) return;
    e.currentTarget.style.background = (variants[variant] || variants.primary).background;
    e.currentTarget.style.opacity = "1";
  };
  const onDown = (e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.98)"; };
  const onUp = (e) => { e.currentTarget.style.transform = "scale(1)"; };

  return (
    <button
      type={type}
      disabled={disabled}
      style={{ ...base, ...v, ...disabledStyle, ...style }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={onDown}
      onMouseUp={onUp}
      {...rest}
    >
      {children}
    </button>
  );
}
