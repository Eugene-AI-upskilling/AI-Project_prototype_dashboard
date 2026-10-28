/* @ds-bundle: {"format":3,"namespace":"CoinoneDesignSystem_c36949","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"Dialog","sourcePath":"components/data/Dialog.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"ea8c38d4f37a","components/core/Button.jsx":"600c7bd7f8a5","components/core/Chip.jsx":"530f6b3d0482","components/core/IconButton.jsx":"b117dba2b14a","components/data/Card.jsx":"e42abf15564e","components/data/Dialog.jsx":"6f3d7ac141e9","components/data/Table.jsx":"5e6c1e91cce8","components/data/Tabs.jsx":"6d9d3beea4be","components/forms/Input.jsx":"bc0b3703db58","ui_kits/exchange/ChartPane.jsx":"3c1e8f82c551","ui_kits/exchange/ExchangeHeader.jsx":"dfdc1b1eb89c","ui_kits/exchange/MarketList.jsx":"22c0dd67603a","ui_kits/exchange/OrderForm.jsx":"932d5eac014b","ui_kits/exchange/data.jsx":"b5909fc9c836","ui_kits/marketing/Hero.jsx":"467c144a7da0","ui_kits/marketing/MarketingNav.jsx":"451fe6bf35f1","ui_kits/marketing/Sections.jsx":"d9dd9ece39fc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CoinoneDesignSystem_c36949 = window.CoinoneDesignSystem_c36949 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Badge — small status / label pill. tone sets the color; "up"/"down"
 * follow KR trading convention (up=red, down=blue). Flat, quiet, no shadow.
 */
function Badge({
  children,
  tone = "neutral",
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      background: "var(--color-surface-tint)",
      color: "var(--ink-800)"
    },
    brand: {
      background: "rgba(11,89,213,0.1)",
      color: "var(--color-primary)"
    },
    point: {
      background: "rgba(0,144,255,0.12)",
      color: "#0077d0"
    },
    up: {
      background: "rgba(224,52,75,0.1)",
      color: "var(--price-up)"
    },
    down: {
      background: "rgba(11,89,213,0.1)",
      color: "var(--price-down)"
    },
    muted: {
      background: "transparent",
      color: "var(--color-muted)",
      border: "1px solid var(--color-hairline)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Button — one filled-blue primary per view; outline/ghost for the rest.
 * Variants: primary (filled #0B59D5), secondary (white + hairline border),
 * accent (transparent + #1772F8 outline), text (link), store / store-dark.
 */
function Button({
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
    sm: {
      height: 36,
      padding: "0 14px",
      font: "var(--text-body)"
    },
    md: {
      height: 46,
      padding: "0 18px",
      font: "var(--text-control)"
    },
    lg: {
      height: 49,
      padding: "0 22px",
      font: "var(--text-control)"
    }
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
    whiteSpace: "nowrap"
  };
  const variants = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
      fontWeight: "var(--weight-bold)"
    },
    secondary: {
      background: "var(--color-surface)",
      color: "var(--color-foreground)",
      borderColor: "var(--color-hairline)",
      fontWeight: "var(--weight-medium)"
    },
    accent: {
      background: "transparent",
      color: "var(--color-accent-outline)",
      borderColor: "var(--color-accent-outline)",
      borderRadius: "var(--radius-sm)",
      fontWeight: "var(--weight-bold)",
      height: 24,
      padding: "0 8px",
      fontSize: "var(--text-micro)"
    },
    text: {
      background: "transparent",
      color: "var(--color-primary)",
      fontWeight: "var(--weight-regular)",
      fontSize: "var(--text-link)",
      height: "auto",
      padding: 0
    },
    store: {
      background: "var(--color-surface-tint)",
      color: "var(--color-foreground)",
      borderRadius: "var(--radius-lg)",
      fontWeight: "var(--weight-bold)",
      fontSize: "13px",
      height: 48,
      padding: "0 16px"
    },
    "store-dark": {
      background: "var(--ink-900)",
      color: "var(--white)",
      borderRadius: "var(--radius-lg)",
      fontWeight: "var(--weight-bold)",
      fontSize: "13px",
      height: 48,
      padding: "0 16px"
    }
  };
  const disabledStyle = disabled ? {
    background: variant === "primary" ? "var(--color-disabled)" : base.background,
    color: "var(--color-muted)",
    borderColor: variant === "secondary" ? "var(--color-hairline)" : "transparent",
    opacity: variant === "primary" ? 1 : 0.55
  } : {};
  const v = variants[variant] || variants.primary;
  const onEnter = e => {
    if (disabled) return;
    if (variant === "primary") e.currentTarget.style.background = "var(--color-primary-hover)";else if (variant === "secondary") e.currentTarget.style.background = "var(--color-surface-tint)";else if (variant === "accent" || variant === "text") e.currentTarget.style.opacity = "0.78";else if (variant === "store") e.currentTarget.style.background = "#e1e8ef";else if (variant === "store-dark") e.currentTarget.style.background = "#17181b";
  };
  const onLeave = e => {
    if (disabled) return;
    e.currentTarget.style.background = (variants[variant] || variants.primary).background;
    e.currentTarget.style.opacity = "1";
  };
  const onDown = e => {
    if (!disabled) e.currentTarget.style.transform = "scale(0.98)";
  };
  const onUp = e => {
    e.currentTarget.style.transform = "scale(1)";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    style: {
      ...base,
      ...v,
      ...disabledStyle,
      ...style
    },
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: onDown,
    onMouseUp: onUp
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Chip — filter / toggle chip. White with hairline border by default;
 * active state gains a near-black border + bold weight (no fill change).
 */
function Chip({
  children,
  active = false,
  onClick,
  style = {},
  ...rest
}) {
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
    transition: "border-color var(--dur-micro) var(--ease-out), background var(--dur-micro) var(--ease-out)"
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      ...base,
      ...style
    },
    onMouseEnter: e => {
      if (!active) e.currentTarget.style.background = "var(--color-surface-tint)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--color-surface)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone IconButton — circular icon-only control. Pass an inline SVG (or any
 * node) as children; inherits currentColor. Default sits on imagery as a
 * semi-transparent dark circle; "ghost" sits on white surfaces.
 */
function IconButton({
  children,
  variant = "ghost",
  size = 36,
  label,
  disabled = false,
  style = {},
  ...rest
}) {
  const variants = {
    overlay: {
      background: "rgba(0,0,0,0.4)",
      color: "var(--white)"
    },
    ghost: {
      background: "transparent",
      color: "var(--color-foreground)"
    },
    tint: {
      background: "var(--color-surface-tint)",
      color: "var(--color-foreground)"
    }
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
    transition: "background var(--dur-micro) var(--ease-out), opacity var(--dur-micro) var(--ease-out)"
  };
  const onEnter = e => {
    if (disabled) return;
    if (variant === "ghost") e.currentTarget.style.background = "var(--color-surface-tint)";else e.currentTarget.style.opacity = "0.82";
  };
  const onLeave = e => {
    if (disabled) return;
    e.currentTarget.style.background = v.background;
    e.currentTarget.style.opacity = "1";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    disabled: disabled,
    style: {
      ...base,
      ...v,
      ...style
    },
    onMouseEnter: onEnter,
    onMouseLeave: onLeave
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Card — flat white surface with a hairline border and 8px radius.
 * Low elevation by default; pass elevated for the soft floating-menu shadow.
 * Optional title / right-aligned action header.
 */
function Card({
  children,
  title,
  action,
  elevated = false,
  padding = 20,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-md)",
      boxShadow: elevated ? "var(--shadow-soft)" : "none",
      overflow: "hidden",
      ...style
    }
  }, rest), (title || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `14px ${padding}px`,
      borderBottom: "1px solid var(--color-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-bold)",
      color: "var(--color-foreground)"
    }
  }, title), action), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/Dialog.jsx
try { (() => {
/**
 * Coinone Dialog — centered modal over a dim scrim. Soft short shadow, 10px
 * radius. Title + optional close, body content, and a footer action row.
 * Renders nothing when open is false.
 */
function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 420
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(4,5,5,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      zIndex: 1000,
      animation: "cnFade var(--dur-toggle) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width,
      maxWidth: "100%",
      background: "var(--color-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-pop)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 22px 0"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-title)",
      fontWeight: "var(--weight-bold)",
      color: "var(--color-foreground)"
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "\uB2EB\uAE30",
    onClick: onClose,
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--color-muted)",
      padding: 4,
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 22px 20px",
      fontSize: "var(--text-body)",
      color: "var(--color-body)",
      lineHeight: "var(--leading-body)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-sm)",
      padding: "0 22px 22px",
      justifyContent: "flex-end"
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, `@keyframes cnFade{from{opacity:0}to{opacity:1}}`));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Table — dense data table for market / list rows. columns define
 * header label, alignment, and an optional cell renderer; numeric columns run
 * right-aligned with tabular numerals. Thin hairline row dividers, no card shadow.
 */
function Table({
  columns = [],
  rows = [],
  onRowClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("table", _extends({
    className: "cn-figure",
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-body)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || "left",
      padding: "10px 12px",
      fontSize: "var(--text-micro)",
      fontWeight: "var(--weight-medium)",
      color: "var(--color-muted)",
      borderBottom: "1px solid var(--color-hairline)",
      whiteSpace: "nowrap"
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: row.id ?? i,
    onClick: onRowClick ? () => onRowClick(row) : undefined,
    style: {
      cursor: onRowClick ? "pointer" : "default",
      transition: "background var(--dur-micro) var(--ease-out)"
    },
    onMouseEnter: e => {
      if (onRowClick) e.currentTarget.style.background = "var(--color-surface-tint)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align || "left",
      padding: "12px",
      color: "var(--color-foreground)",
      fontWeight: c.align === "right" ? "var(--weight-semibold)" : "var(--weight-regular)",
      borderBottom: "1px solid var(--color-hairline)",
      whiteSpace: "nowrap"
    }
  }, c.render ? c.render(row[c.key], row) : row[c.key]))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/data/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Tabs — underline tab bar. Active tab gains near-black bold label and
 * a 2px blue underline. items: [{ id, label }]; controlled via value/onChange.
 */
function Tabs({
  items = [],
  value,
  onChange,
  style = {},
  ...rest
}) {
  const [internal, setInternal] = React.useState(items[0] && items[0].id);
  const active = value !== undefined ? value : internal;
  const select = id => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: "var(--space-xl)",
      borderBottom: "1px solid var(--color-hairline)",
      ...style
    }
  }, rest), items.map(it => {
    const on = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(it.id),
      style: {
        position: "relative",
        border: "none",
        background: "transparent",
        padding: "0 0 12px",
        fontSize: "var(--text-link)",
        fontFamily: "var(--font-sans)",
        fontWeight: on ? "var(--weight-bold)" : "var(--weight-medium)",
        color: on ? "var(--color-foreground)" : "var(--color-muted)",
        cursor: "pointer",
        transition: "color var(--dur-micro) var(--ease-out)"
      }
    }, it.label, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        background: on ? "var(--color-primary)" : "transparent",
        borderRadius: 2
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Coinone Input — labeled text field with optional helper / error. Hairline
 * border, 8px radius; focus ring uses the accent outline blue; error state
 * turns the border + helper red.
 */
function Input({
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
  const borderColor = error ? "var(--danger)" : focused ? "var(--color-accent-outline)" : "var(--color-hairline)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: "var(--text-micro)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--color-body)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      height: 46,
      padding: "0 14px",
      background: "var(--color-surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      boxShadow: focused && !error ? "0 0 0 3px rgba(23,114,248,0.12)" : "none",
      transition: "border-color var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: e => {
      setFocused(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur && rest.onBlur(e);
    }
  }, rest, {
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-control)",
      color: "var(--color-foreground)",
      minWidth: 0
    }
  })), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-body)",
      color: "var(--color-muted)",
      marginLeft: 8
    }
  }, suffix)), (helper || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-micro)",
      color: error ? "var(--danger)" : "var(--color-muted)"
    }
  }, error || helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// ui_kits/exchange/ChartPane.jsx
try { (() => {
// Coinone Exchange — center chart pane.
function ChartPane({
  market
}) {
  const {
    Badge,
    Tabs
  } = window.CoinoneDesignSystem_c36949;
  const [range, setRange] = React.useState("1d");
  const up = market.change >= 0;
  const color = up ? "var(--price-up)" : "var(--price-down)";

  // deterministic pseudo line for the selected market
  const pts = React.useMemo(() => {
    let seed = market.sym.charCodeAt(0) + market.sym.length;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const arr = [];
    let y = 60;
    for (let i = 0; i < 48; i++) {
      y += (rnd() - (up ? 0.45 : 0.55)) * 14;
      y = Math.max(12, Math.min(108, y));
      arr.push(y);
    }
    return arr;
  }, [market.sym, up]);
  const path = pts.map((y, i) => `${i / (pts.length - 1) * 760},${y}`).join(" ");
  const area = `0,120 ${path} 760,120`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--white)",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "16px 24px",
      borderBottom: "1px solid var(--color-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-title)",
      fontWeight: 700
    }
  }, market.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-body)",
      color: "var(--color-muted)"
    }
  }, market.sym, "/KRW"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "cn-figure",
    style: {
      fontSize: "var(--text-hero)",
      fontWeight: 700,
      color,
      lineHeight: 1.1
    }
  }, won(market.price)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: up ? "up" : "down"
  }, up ? "+" : "", market.change.toFixed(2), "%"), /*#__PURE__*/React.createElement("span", {
    className: "cn-figure",
    style: {
      fontSize: "var(--text-micro)",
      color: "var(--color-muted)"
    }
  }, "24h \uAC70\uB798\uB300\uAE08 ", market.vol)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 24px 0"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      id: "1d",
      label: "1일"
    }, {
      id: "1w",
      label: "1주"
    }, {
      id: "1m",
      label: "1개월"
    }, {
      id: "1y",
      label: "1년"
    }],
    value: range,
    onChange: setRange
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 24,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 760 120",
    preserveAspectRatio: "none",
    style: {
      width: "100%",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "cnFill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: up ? "rgba(224,52,75,0.18)" : "rgba(11,89,213,0.18)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: up ? "rgba(224,52,75,0)" : "rgba(11,89,213,0)"
  }))), /*#__PURE__*/React.createElement("polygon", {
    points: area,
    fill: "url(#cnFill)"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: path,
    fill: "none",
    stroke: up ? "#E0344B" : "#0B59D5",
    strokeWidth: "1.5",
    vectorEffect: "non-scaling-stroke"
  }))));
}
Object.assign(window, {
  ChartPane
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/exchange/ChartPane.jsx", error: String((e && e.message) || e) }); }

// ui_kits/exchange/ExchangeHeader.jsx
try { (() => {
// Coinone Exchange — top navigation bar.
function ExchangeHeader() {
  const {
    IconButton,
    Button
  } = window.CoinoneDesignSystem_c36949;
  const nav = ["거래소", "간편구매", "스마트 트레이딩", "코인동향", "고객센터"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 28,
      height: 60,
      padding: "0 24px",
      background: "var(--white)",
      borderBottom: "1px solid var(--color-hairline)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/coinone-wordmark.svg",
    height: "22",
    alt: "coinone",
    style: {
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 22
    }
  }, nav.map((n, i) => /*#__PURE__*/React.createElement("a", {
    key: n,
    href: "#",
    style: {
      fontSize: "var(--text-body)",
      fontWeight: i === 0 ? 700 : 500,
      color: i === 0 ? "var(--color-foreground)" : "var(--color-muted)"
    }
  }, n))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    variant: "ghost",
    label: "\uC54C\uB9BC"
  }, /*#__PURE__*/React.createElement(Icon.bell, null)), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "\uB85C\uADF8\uC778"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "\uD68C\uC6D0\uAC00\uC785"));
}
Object.assign(window, {
  ExchangeHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/exchange/ExchangeHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/exchange/MarketList.jsx
try { (() => {
// Coinone Exchange — left market list pane.
function MarketList({
  selected,
  onSelect
}) {
  const {
    Chip,
    Table
  } = window.CoinoneDesignSystem_c36949;
  const [tab, setTab] = React.useState("krw");
  const [q, setQ] = React.useState("");
  const [favs, setFavs] = React.useState({
    btc: true
  });
  const filtered = CN_MARKETS.filter(m => m.name.includes(q) || m.sym.toLowerCase().includes(q.toLowerCase()));
  const Pct = v => /*#__PURE__*/React.createElement("span", {
    style: {
      color: v >= 0 ? "var(--price-up)" : "var(--price-down)",
      fontWeight: 600
    }
  }, v >= 0 ? "+" : "", v.toFixed(2), "%");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 360,
      flex: "none",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid var(--color-hairline)",
      background: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderBottom: "1px solid var(--color-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 40,
      padding: "0 12px",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-md)",
      color: "var(--color-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon.search, {
    s: 16
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\uCF54\uC778 \uAC80\uC0C9",
    style: {
      border: "none",
      outline: "none",
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-body)",
      color: "var(--color-foreground)",
      background: "transparent"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 12
    }
  }, [["krw", "원화"], ["fav", "관심"], ["new", "신규"]].map(([id, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: id,
    active: tab === id,
    onClick: () => setTab(id)
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: "name",
      header: "이름",
      render: (_, r) => /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        onClick: e => {
          e.stopPropagation();
          setFavs(f => ({
            ...f,
            [r.id]: !f[r.id]
          }));
        },
        style: {
          color: favs[r.id] ? "var(--blue-point)" : "var(--gray-200)",
          cursor: "pointer",
          lineHeight: 0
        }
      }, /*#__PURE__*/React.createElement(Icon.star, {
        s: 15,
        fill: favs[r.id] ? "currentColor" : "none"
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: "var(--text-body)"
        }
      }, r.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "var(--color-muted)"
        }
      }, r.sym, "/KRW")))
    }, {
      key: "price",
      header: "현재가",
      align: "right",
      render: v => won(v)
    }, {
      key: "change",
      header: "변동",
      align: "right",
      render: v => Pct(v)
    }],
    rows: tab === "fav" ? filtered.filter(m => favs[m.id]) : filtered,
    onRowClick: r => onSelect(r.id)
  })));
}
Object.assign(window, {
  MarketList
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/exchange/MarketList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/exchange/OrderForm.jsx
try { (() => {
// Coinone Exchange — right order form pane.
function OrderForm({
  market,
  onSubmit
}) {
  const {
    Button,
    Input,
    Tabs
  } = window.CoinoneDesignSystem_c36949;
  const [side, setSide] = React.useState("buy");
  const [price, setPrice] = React.useState(market.price);
  const [qty, setQty] = React.useState("");
  React.useEffect(() => {
    setPrice(market.price);
  }, [market.price]);
  const total = qty ? Math.round(Number(qty) * price) : 0;
  const buying = side === "buy";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 320,
      flex: "none",
      borderLeft: "1px solid var(--color-hairline)",
      background: "var(--white)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 18px 0"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      id: "buy",
      label: "매수"
    }, {
      id: "sell",
      label: "매도"
    }],
    value: side,
    onChange: setSide
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--text-micro)",
      color: "var(--color-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uC8FC\uBB38 \uAC00\uB2A5"), /*#__PURE__*/React.createElement("span", {
    className: "cn-figure",
    style: {
      color: "var(--color-foreground)",
      fontWeight: 600
    }
  }, buying ? "₩2,480,000" : "0.0214 " + market.sym)), /*#__PURE__*/React.createElement(Input, {
    label: "\uAC00\uACA9 (KRW)",
    value: price.toLocaleString("ko-KR"),
    onChange: e => setPrice(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "\uC218\uB7C9",
    suffix: market.sym,
    value: qty,
    onChange: e => setQty(e.target.value.replace(/[^0-9.]/g, "")),
    placeholder: "0"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, ["10%", "25%", "50%", "100%"].map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    type: "button",
    onClick: () => setQty((0.0214 * parseInt(p) / 100).toFixed(4)),
    style: {
      flex: 1,
      height: 30,
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-chip)",
      background: "var(--white)",
      color: "var(--color-muted)",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, p))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderTop: "1px solid var(--color-hairline)",
      borderBottom: "1px solid var(--color-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-body)",
      color: "var(--color-muted)"
    }
  }, "\uC8FC\uBB38 \uCD1D\uC561"), /*#__PURE__*/React.createElement("span", {
    className: "cn-figure",
    style: {
      fontWeight: 700
    }
  }, won(total))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    style: buying ? {} : {
      background: "var(--price-up)"
    },
    onClick: () => onSubmit(side, market, total)
  }, market.name, " ", buying ? "매수" : "매도"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "var(--color-muted)",
      margin: 0,
      lineHeight: 1.5
    }
  }, "\uC218\uC218\uB8CC\uB294 \uCCB4\uACB0 \uAE08\uC561\uC758 0.05%\uC774\uBA70 \uC8FC\uBB38 \uC2DC \uC548\uB0B4\uB429\uB2C8\uB2E4. \uB514\uC9C0\uD138 \uC790\uC0B0 \uD22C\uC790\uB294 \uC6D0\uAE08 \uC190\uC2E4\uC758 \uC704\uD5D8\uC774 \uC788\uC2B5\uB2C8\uB2E4.")));
}
Object.assign(window, {
  OrderForm
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/exchange/OrderForm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/exchange/data.jsx
try { (() => {
// Coinone Exchange — shared market data + small inline icons.
const CN_MARKETS = [{
  id: "btc",
  sym: "BTC",
  name: "비트코인",
  price: 142300000,
  change: 2.41,
  vol: "1,204억"
}, {
  id: "eth",
  sym: "ETH",
  name: "이더리움",
  price: 4820500,
  change: -1.08,
  vol: "892억"
}, {
  id: "xrp",
  sym: "XRP",
  name: "리플",
  price: 3212,
  change: 5.62,
  vol: "2,031억"
}, {
  id: "sol",
  sym: "SOL",
  name: "솔라나",
  price: 268400,
  change: -0.34,
  vol: "421억"
}, {
  id: "doge",
  sym: "DOGE",
  name: "도지코인",
  price: 312,
  change: 1.27,
  vol: "688억"
}, {
  id: "ada",
  sym: "ADA",
  name: "에이다",
  price: 1184,
  change: -2.15,
  vol: "204억"
}, {
  id: "trx",
  sym: "TRX",
  name: "트론",
  price: 412,
  change: 0.08,
  vol: "151억"
}, {
  id: "link",
  sym: "LINK",
  name: "체인링크",
  price: 38420,
  change: 3.94,
  vol: "97억"
}];
const won = n => "₩" + n.toLocaleString("ko-KR");
const Icon = {
  search: p => /*#__PURE__*/React.createElement("svg", {
    width: p?.s || 18,
    height: p?.s || 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  star: p => /*#__PURE__*/React.createElement("svg", {
    width: p?.s || 18,
    height: p?.s || 18,
    viewBox: "0 0 24 24",
    fill: p?.fill || "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
  })),
  bell: p => /*#__PURE__*/React.createElement("svg", {
    width: p?.s || 18,
    height: p?.s || 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  spark: p => /*#__PURE__*/React.createElement("svg", {
    width: p?.s || 18,
    height: p?.s || 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v2m0 14v2M5 12H3m18 0h-2M6 6l1.5 1.5M18 18l-1.5-1.5M6 18l1.5-1.5M18 6l-1.5 1.5"
  }))
};
Object.assign(window, {
  CN_MARKETS,
  won,
  Icon
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/exchange/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Hero.jsx
try { (() => {
// Coinone Marketing — hero with single primary CTA + live ticker strip.
function Hero() {
  const {
    Button,
    Badge
  } = window.CoinoneDesignSystem_c36949;
  const ticks = [{
    s: "BTC",
    p: "142,300,000",
    c: 2.41
  }, {
    s: "ETH",
    p: "4,820,500",
    c: -1.08
  }, {
    s: "XRP",
    p: "3,212",
    c: 5.62
  }, {
    s: "SOL",
    p: "268,400",
    c: -0.34
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "80px 40px 64px",
      textAlign: "center",
      maxWidth: 880,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "point",
    style: {
      marginBottom: 20
    }
  }, "AI \uC2A4\uB9C8\uD2B8 \uD2B8\uB808\uC774\uB529 \uCD9C\uC2DC"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.15,
      color: "var(--blue-navy)",
      margin: 0
    }
  }, "\uC548\uC804\uD558\uAC8C \uC2DC\uC791\uD558\uB294", /*#__PURE__*/React.createElement("br", null), "\uAC00\uC7A5 \uC26C\uC6B4 \uB514\uC9C0\uD138 \uC790\uC0B0 \uD22C\uC790"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: var_lead,
      color: "var(--color-muted)",
      marginTop: 20,
      lineHeight: 1.6
    }
  }, "2014\uB144\uBD80\uD130 \uC774\uC5B4\uC628 \uC2E0\uB8B0. \uC218\uC218\uB8CC\uC640 \uC704\uD5D8\uC744 \uBA85\uD655\uD788 \uC548\uB0B4\uD558\uB294", /*#__PURE__*/React.createElement("br", null), "\uADDC\uC81C \uC900\uC218 \uAC70\uB798\uC18C\uC5D0\uC11C \uB531 30\uCD08\uBA74 \uAC00\uC785\uD560 \uC218 \uC788\uC5B4\uC694."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "30\uCD08\uBA74 \uAC00\uC785 \uC644\uB8CC"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "\uAC70\uB798\uC18C \uB458\uB7EC\uBCF4\uAE30")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginTop: 48,
      flexWrap: "wrap"
    }
  }, ticks.map(t => {
    const up = t.c >= 0;
    return /*#__PURE__*/React.createElement("div", {
      key: t.s,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: "var(--white)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: "var(--text-body)"
      }
    }, t.s), /*#__PURE__*/React.createElement("span", {
      className: "cn-figure",
      style: {
        fontSize: "var(--text-body)",
        color: "var(--color-body)"
      }
    }, "\u20A9", t.p), /*#__PURE__*/React.createElement("span", {
      className: "cn-figure",
      style: {
        fontSize: "var(--text-micro)",
        fontWeight: 700,
        color: up ? "var(--price-up)" : "var(--price-down)"
      }
    }, up ? "+" : "", t.c, "%"));
  })));
}
const var_lead = "18px";
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingNav.jsx
try { (() => {
// Coinone Marketing — top navigation.
function MarketingNav() {
  const {
    Button
  } = window.CoinoneDesignSystem_c36949;
  const links = ["거래소", "간편구매", "스마트 트레이딩", "코인동향", "고객센터"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      gap: 30,
      height: 64,
      padding: "0 40px",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--color-hairline)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/coinone-wordmark.svg",
    height: "22",
    alt: "coinone"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 24
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: "var(--text-body)",
      fontWeight: 500,
      color: "var(--color-body)"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "text",
    style: {
      fontSize: "var(--text-body)"
    }
  }, "\uB85C\uADF8\uC778"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "\uD68C\uC6D0\uAC00\uC785"));
}
Object.assign(window, {
  MarketingNav
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
// Coinone Marketing — trust/feature row + signup CTA + footer.
function Features() {
  const {
    Card
  } = window.CoinoneDesignSystem_c36949;
  const items = [{
    t: "규제 준수 거래소",
    d: "2014년부터 운영된 국내 1세대 거래소. 자금세탁방지와 고객확인 절차를 충실히 따릅니다."
  }, {
    t: "명확한 수수료",
    d: "체결 금액의 0.05%. 숨은 비용 없이 주문 시 명확하게 안내합니다."
  }, {
    t: "AI 스마트 트레이딩",
    d: "AI 그리드 자동매매로 설정해두면 알아서. 복잡한 전략을 쉽게 시작하세요."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1040,
      margin: "0 auto",
      padding: "56px 40px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--text-hero)",
      fontWeight: 700,
      color: "var(--blue-navy)",
      textAlign: "center",
      marginBottom: 36,
      letterSpacing: "-0.02em"
    }
  }, "\uC2E0\uB8B0\uB97C \uBA3C\uC800, \uADF8 \uB2E4\uC74C \uC18D\uB3C4"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-md)",
      background: "var(--surface-tint)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-primary)",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: 700,
      marginBottom: 8
    }
  }, it.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-body)",
      color: "var(--color-muted)",
      lineHeight: 1.6,
      margin: 0
    }
  }, it.d)))));
}
function SignupCTA({
  onJoin
}) {
  const {
    Button,
    Input
  } = window.CoinoneDesignSystem_c36949;
  const [email, setEmail] = React.useState("");
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--blue-navy)",
      padding: "64px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 520,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--text-hero)",
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "-0.02em"
    }
  }, "\uB531 30\uCD08\uBA74 \uC644\uB8CC\uD560 \uC218 \uC788\uC5B4\uC694"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "rgba(255,255,255,0.7)",
      marginTop: 12,
      marginBottom: 28,
      fontSize: "var(--text-link)"
    }
  }, "\uC774\uBA54\uC77C\uB9CC \uC788\uC73C\uBA74 \uC9C0\uAE08 \uBC14\uB85C \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      background: "#fff",
      padding: 10,
      borderRadius: "var(--radius-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "you@coinone.co.kr",
    value: email,
    onChange: e => setEmail(e.target.value),
    style: {}
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => onJoin(email)
  }, "\uD68C\uC6D0\uAC00\uC785")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "store-dark"
  }, "App Store"), /*#__PURE__*/React.createElement(Button, {
    variant: "store-dark"
  }, "Google Play"))));
}
function MarketingFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: "32px 40px",
      borderTop: "1px solid var(--color-hairline)",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/coinone-symbol.svg",
    width: "28",
    height: "28",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-micro)",
      color: "var(--color-muted)"
    }
  }, "\uB514\uC9C0\uD138 \uC790\uC0B0 \uD22C\uC790\uB294 \uC6D0\uAE08 \uC190\uC2E4\uC758 \uC704\uD5D8\uC774 \uC788\uC2B5\uB2C8\uB2E4. \xA9 2014\u20132026 Coinone, Inc."));
}
Object.assign(window, {
  Features,
  SignupCTA,
  MarketingFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Input = __ds_scope.Input;

})();
