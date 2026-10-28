// Coinone Marketing — trust/feature row + signup CTA + footer.
function Features() {
  const { Card } = window.CoinoneDesignSystem_c36949;
  const items = [
    { t: "규제 준수 거래소", d: "2014년부터 운영된 국내 1세대 거래소. 자금세탁방지와 고객확인 절차를 충실히 따릅니다." },
    { t: "명확한 수수료", d: "체결 금액의 0.05%. 숨은 비용 없이 주문 시 명확하게 안내합니다." },
    { t: "AI 스마트 트레이딩", d: "AI 그리드 자동매매로 설정해두면 알아서. 복잡한 전략을 쉽게 시작하세요." },
  ];
  return (
    <section style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 40px" }}>
      <h2 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "var(--blue-navy)", textAlign: "center", marginBottom: 36, letterSpacing: "-0.02em" }}>
        신뢰를 먼저, 그 다음 속도
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {items.map((it, i) => (
          <Card key={i}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--surface-tint)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: 8 }}>{it.t}</h3>
            <p style={{ fontSize: "var(--text-body)", color: "var(--color-muted)", lineHeight: 1.6, margin: 0 }}>{it.d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SignupCTA({ onJoin }) {
  const { Button, Input } = window.CoinoneDesignSystem_c36949;
  const [email, setEmail] = React.useState("");
  return (
    <section style={{ background: "var(--blue-navy)", padding: "64px 40px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "var(--text-hero)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>딱 30초면 완료할 수 있어요</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 12, marginBottom: 28, fontSize: "var(--text-link)" }}>이메일만 있으면 지금 바로 시작할 수 있습니다.</p>
        <div style={{ display: "flex", gap: 10, background: "#fff", padding: 10, borderRadius: "var(--radius-lg)" }}>
          <div style={{ flex: 1 }}>
            <Input placeholder="you@coinone.co.kr" value={email} onChange={(e) => setEmail(e.target.value)} style={{ }} />
          </div>
          <Button variant="primary" size="lg" onClick={() => onJoin(email)}>회원가입</Button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
          <Button variant="store-dark">App Store</Button>
          <Button variant="store-dark">Google Play</Button>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer style={{ padding: "32px 40px", borderTop: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 16 }}>
      <img src="../../assets/coinone-symbol.svg" width="28" height="28" alt="" />
      <span style={{ fontSize: "var(--text-micro)", color: "var(--color-muted)" }}>
        디지털 자산 투자는 원금 손실의 위험이 있습니다. © 2014–2026 Coinone, Inc.
      </span>
    </footer>
  );
}
Object.assign(window, { Features, SignupCTA, MarketingFooter });
