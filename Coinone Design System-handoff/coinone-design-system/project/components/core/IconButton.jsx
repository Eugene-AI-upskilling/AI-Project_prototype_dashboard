import React from "react";

/**
 * Coinone IconButton — circular icon-only control. Pass an inline SVG (or any
 * node) as children; inherits currentColor. Default sits on imagery as a
 * semi-transparent dark circle; "ghost" sits on white surfaces.
 */
export function IconButton({
  children,
  variant = "ghost",
  size = 36,
  label,
  disabled = false,
  style = {},
  ...rest
}) {
  const variants = {
    overlay: { background: "rgba(0,0,0,0.4)", color: "var(--white)" },
    ghost: { background: "transparent", color: "var(--color-foreground)" },
    tint: { background: "var(--color-surface-tint)", color: "var(--color-foreground)" },
  };
  const v = variants[variant] || variants.ghost;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    padding: 5,
    border: "none",
    borderRadius: "var(--radius-full)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--dur-micro) var(--ease-out), opacity var(--dur-micro) var(--ease-out)",
  };

  const onEnter = (e) => {
    if (disabled) return;
    if (variant === "ghost") e.currentTarget.style.background = "var(--color-surface-tint)";
    else e.currentTarget.style.opacity = "0.82";
  };
  const onLeave = (e) => {
    if (disabled) return;
    e.currentTarget.style.background = v.background;
    e.currentTarget.style.opacity = "1";
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      style={{ ...base, ...v, ...style }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...rest}
    >
      {children}
    </button>
  );
}
