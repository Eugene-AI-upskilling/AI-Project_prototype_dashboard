// Coinone Marketing — hero with single primary CTA + live ticker strip.
function Hero() {
  const { Button, Badge } = window.CoinoneDesignSystem_c36949;
  const ticks = [
    { s: "BTC", p: "142,300,000", c: 2.41 },
    { s: "ETH", p: "4,820,500", c: -1.08 },
    { s: "XRP", p: "3,212", c: 5.62 },
    { s: "SOL", p: "268,400", c: -0.34 },
  ];
  return (
    <section style={{ padding: "80px 40px 64px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
      <Badge tone="point" style={{ marginBottom: 20 }}>AI 스마트 트레이딩 출시</Badge>
      <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--blue-navy)", margin: 0 }}>
        안전하게 시작하는<br />가장 쉬운 디지털 자산 투자
      </h1>
      <p style={{ fontSize: var_lead, color: "var(--color-muted)", marginTop: 20, lineHeight: 1.6 }}>
        2014년부터 이어온 신뢰. 수수료와 위험을 명확히 안내하는<br />규제 준수 거래소에서 딱 30초면 가입할 수 있어요.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
        <Button variant="primary" size="lg">30초면 가입 완료</Button>
        <Button variant="secondary" size="lg">거래소 둘러보기</Button>
      </div>
      {/* ticker strip */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
        {ticks.map((t) => {
          const up = t.c >= 0;
          return (
            <div key={t.s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--white)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--text-body)" }}>{t.s}</span>
              <span className="cn-figure" style={{ fontSize: "var(--text-body)", color: "var(--color-body)" }}>₩{t.p}</span>
              <span className="cn-figure" style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: up ? "var(--price-up)" : "var(--price-down)" }}>{up ? "+" : ""}{t.c}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
const var_lead = "18px";
Object.assign(window, { Hero });
