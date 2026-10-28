import React from "react";

/**
 * Coinone Table — dense data table for market / list rows. columns define
 * header label, alignment, and an optional cell renderer; numeric columns run
 * right-aligned with tabular numerals. Thin hairline row dividers, no card shadow.
 */
export function Table({ columns = [], rows = [], onRowClick, style = {}, ...rest }) {
  return (
    <table
      className="cn-figure"
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-body)",
        ...style,
      }}
      {...rest}
    >
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: c.align || "left",
                padding: "10px 12px",
                fontSize: "var(--text-micro)",
                fontWeight: "var(--weight-medium)",
                color: "var(--color-muted)",
                borderBottom: "1px solid var(--color-hairline)",
                whiteSpace: "nowrap",
              }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id ?? i}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={{ cursor: onRowClick ? "pointer" : "default", transition: "background var(--dur-micro) var(--ease-out)" }}
            onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = "var(--color-surface-tint)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                style={{
                  textAlign: c.align || "left",
                  padding: "12px",
                  color: "var(--color-foreground)",
                  fontWeight: c.align === "right" ? "var(--weight-semibold)" : "var(--weight-regular)",
                  borderBottom: "1px solid var(--color-hairline)",
                  whiteSpace: "nowrap",
                }}
              >
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
