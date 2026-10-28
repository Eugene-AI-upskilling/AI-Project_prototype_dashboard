import React from "react";

/**
 * Coinone Tabs — underline tab bar. Active tab gains near-black bold label and
 * a 2px blue underline. items: [{ id, label }]; controlled via value/onChange.
 */
export function Tabs({ items = [], value, onChange, style = {}, ...rest }) {
  const [internal, setInternal] = React.useState(items[0] && items[0].id);
  const active = value !== undefined ? value : internal;
  const select = (id) => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return (
    <div
      role="tablist"
      style={{ display: "flex", gap: "var(--space-xl)", borderBottom: "1px solid var(--color-hairline)", ...style }}
      {...rest}
    >
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => select(it.id)}
            style={{
              position: "relative",
              border: "none",
              background: "transparent",
              padding: "0 0 12px",
              fontSize: "var(--text-link)",
              fontFamily: "var(--font-sans)",
              fontWeight: on ? "var(--weight-bold)" : "var(--weight-medium)",
              color: on ? "var(--color-foreground)" : "var(--color-muted)",
              cursor: "pointer",
              transition: "color var(--dur-micro) var(--ease-out)",
            }}
          >
            {it.label}
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -1,
                height: 2,
                background: on ? "var(--color-primary)" : "transparent",
                borderRadius: 2,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
