// Coinone Exchange — left market list pane.
function MarketList({ selected, onSelect }) {
  const { Chip, Table } = window.CoinoneDesignSystem_c36949;
  const [tab, setTab] = React.useState("krw");
  const [q, setQ] = React.useState("");
  const [favs, setFavs] = React.useState({ btc: true });

  const filtered = CN_MARKETS.filter(
    (m) => m.name.includes(q) || m.sym.toLowerCase().includes(q.toLowerCase())
  );

  const Pct = (v) => (
    <span style={{ color: v >= 0 ? "var(--price-up)" : "var(--price-down)", fontWeight: 600 }}>
      {v >= 0 ? "+" : ""}{v.toFixed(2)}%
    </span>
  );

  return (
    <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", borderRight: "1px solid var(--color-hairline)", background: "var(--white)" }}>
      {/* search */}
      <div style={{ padding: 14, borderBottom: "1px solid var(--color-hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", color: "var(--color-muted)" }}>
          <Icon.search s={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코인 검색"
            style={{ border: "none", outline: "none", flex: 1, fontFamily: "var(--font-sans)", fontSize: "var(--text-body)", color: "var(--color-foreground)", background: "transparent" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[["krw","원화"],["fav","관심"],["new","신규"]].map(([id,l]) => (
            <Chip key={id} active={tab===id} onClick={() => setTab(id)}>{l}</Chip>
          ))}
        </div>
      </div>
      {/* list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <Table
          columns={[
            { key: "name", header: "이름", render: (_, r) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span onClick={(e) => { e.stopPropagation(); setFavs((f) => ({ ...f, [r.id]: !f[r.id] })); }}
                  style={{ color: favs[r.id] ? "var(--blue-point)" : "var(--gray-200)", cursor: "pointer", lineHeight: 0 }}>
                  <Icon.star s={15} fill={favs[r.id] ? "currentColor" : "none"} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-body)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{r.sym}/KRW</div>
                </div>
              </div>
            ) },
            { key: "price", header: "현재가", align: "right", render: (v) => won(v) },
            { key: "change", header: "변동", align: "right", render: (v) => Pct(v) },
          ]}
          rows={tab === "fav" ? filtered.filter((m) => favs[m.id]) : filtered}
          onRowClick={(r) => onSelect(r.id)}
        />
      </div>
    </div>
  );
}
Object.assign(window, { MarketList });
