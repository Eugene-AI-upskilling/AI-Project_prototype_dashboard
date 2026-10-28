Dense market / list table. Right-align numeric columns; use `render` for colored price cells (KR convention: up=red, down=blue).

```jsx
<Table
  columns={[
    { key: "name", header: "이름" },
    { key: "price", header: "현재가", align: "right" },
    { key: "change", header: "변동", align: "right",
      render: (v) => <span style={{ color: v >= 0 ? "var(--price-up)" : "var(--price-down)" }}>{v >= 0 ? "+" : ""}{v}%</span> },
  ]}
  rows={markets}
  onRowClick={(r) => openMarket(r)}
/>
```
