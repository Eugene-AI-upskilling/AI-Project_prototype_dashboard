// Coinone Marketing — top navigation.
function MarketingNav() {
  const { Button } = window.CoinoneDesignSystem_c36949;
  const links = ["거래소", "간편구매", "스마트 트레이딩", "코인동향", "고객센터"];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 10,
      display: "flex", alignItems: "center", gap: 30, height: 64, padding: "0 40px",
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--color-hairline)",
    }}>
      <img src="../../assets/coinone-wordmark.svg" height="22" alt="coinone" />
      <nav style={{ display: "flex", gap: 24 }}>
        {links.map((l) => (
          <a key={l} href="#" style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-body)" }}>{l}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <Button variant="text" style={{ fontSize: "var(--text-body)" }}>로그인</Button>
      <Button variant="primary" size="sm">회원가입</Button>
    </header>
  );
}
Object.assign(window, { MarketingNav });
