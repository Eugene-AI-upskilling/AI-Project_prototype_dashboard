// Coinone Exchange — center chart pane.
function ChartPane({ market }) {
  const { Badge, Tabs } = window.CoinoneDesignSystem_c36949;
  const [range, setRange] = React.useState("1d");
  const up = market.change >= 0;
  const color = up ? "var(--price-up)" : "var(--price-down)";

  // deterministic pseudo line for the selected market
  const pts = React.useMemo(() => {
    let seed = market.sym.charCodeAt(0) + market.sym.length;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const arr = []; let y = 60;
    for (let i = 0; i < 48; i++) { y += (rnd() - (up ? 0.45 : 0.55)) * 14; y = Math.max(12, Math.min(108, y)); arr.push(y); }
    return arr;
  }, [market.sym, up]);
  const path = pts.map((y, i) => `${(i / (pts.length - 1)) * 760},${y}`).join(" ");
  const area = `0,120 ${path} 760,120`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--white)", minWidth: 0 }}>
      {/* ticker header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: "var(--text-title)", fontWeight: 700 }}>{market.name}</span>
            <span style={{ fontSize: "var(--text-body)", color: "var(--color-muted)" }}>{market.sym}/KRW</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="cn-figure" style={{ fontSize: "var(--text-hero)", fontWeight: 700, color, lineHeight: 1.1 }}>{won(market.price)}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <Badge tone={up ? "up" : "down"}>{up ? "+" : ""}{market.change.toFixed(2)}%</Badge>
            <span className="cn-figure" style={{ fontSize: "var(--text-micro)", color: "var(--color-muted)" }}>24h 거래대금 {market.vol}</span>
          </div>
        </div>
      </div>
      {/* range tabs */}
      <div style={{ padding: "12px 24px 0" }}>
        <Tabs items={[{id:"1d",label:"1일"},{id:"1w",label:"1주"},{id:"1m",label:"1개월"},{id:"1y",label:"1년"}]} value={range} onChange={setRange} />
      </div>
      {/* chart */}
      <div style={{ flex: 1, padding: 24, minHeight: 0 }}>
        <svg viewBox="0 0 760 120" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="cnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? "rgba(224,52,75,0.18)" : "rgba(11,89,213,0.18)"} />
              <stop offset="100%" stopColor={up ? "rgba(224,52,75,0)" : "rgba(11,89,213,0)"} />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#cnFill)" />
          <polyline points={path} fill="none" stroke={up ? "#E0344B" : "#0B59D5"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}
Object.assign(window, { ChartPane });
