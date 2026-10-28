// Coinone Exchange — top navigation bar.
function ExchangeHeader() {
  const { IconButton, Button } = window.CoinoneDesignSystem_c36949;
  const nav = ["거래소", "간편구매", "스마트 트레이딩", "코인동향", "고객센터"];
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 28, height: 60,
      padding: "0 24px", background: "var(--white)",
      borderBottom: "1px solid var(--color-hairline)", flex: "none",
    }}>
      <img src="../../assets/coinone-wordmark.svg" height="22" alt="coinone" style={{ display: "block" }} />
      <nav style={{ display: "flex", gap: 22 }}>
        {nav.map((n, i) => (
          <a key={n} href="#" style={{
            fontSize: "var(--text-body)", fontWeight: i === 0 ? 700 : 500,
            color: i === 0 ? "var(--color-foreground)" : "var(--color-muted)",
          }}>{n}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <IconButton variant="ghost" label="알림"><Icon.bell /></IconButton>
      <Button variant="secondary" size="sm">로그인</Button>
      <Button variant="primary" size="sm">회원가입</Button>
    </header>
  );
}
Object.assign(window, { ExchangeHeader });
