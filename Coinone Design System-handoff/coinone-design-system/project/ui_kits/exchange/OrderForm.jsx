// Coinone Exchange — right order form pane.
function OrderForm({ market, onSubmit }) {
  const { Button, Input, Tabs } = window.CoinoneDesignSystem_c36949;
  const [side, setSide] = React.useState("buy");
  const [price, setPrice] = React.useState(market.price);
  const [qty, setQty] = React.useState("");

  React.useEffect(() => { setPrice(market.price); }, [market.price]);

  const total = qty ? Math.round(Number(qty) * price) : 0;
  const buying = side === "buy";

  return (
    <div style={{ width: 320, flex: "none", borderLeft: "1px solid var(--color-hairline)", background: "var(--white)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 18px 0" }}>
        <Tabs items={[{id:"buy",label:"매수"},{id:"sell",label:"매도"}]} value={side} onChange={setSide} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-micro)", color: "var(--color-muted)" }}>
          <span>주문 가능</span>
          <span className="cn-figure" style={{ color: "var(--color-foreground)", fontWeight: 600 }}>{buying ? "₩2,480,000" : "0.0214 " + market.sym}</span>
        </div>
        <Input label="가격 (KRW)" value={price.toLocaleString("ko-KR")} onChange={(e) => setPrice(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} />
        <Input label="수량" suffix={market.sym} value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
        <div style={{ display: "flex", gap: 6 }}>
          {["10%","25%","50%","100%"].map((p) => (
            <button key={p} type="button" onClick={() => setQty((0.0214 * parseInt(p) / 100).toFixed(4))}
              style={{ flex: 1, height: 30, border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-chip)", background: "var(--white)", color: "var(--color-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{p}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--color-hairline)", borderBottom: "1px solid var(--color-hairline)" }}>
          <span style={{ fontSize: "var(--text-body)", color: "var(--color-muted)" }}>주문 총액</span>
          <span className="cn-figure" style={{ fontWeight: 700 }}>{won(total)}</span>
        </div>
        <Button variant="primary" fullWidth
          style={buying ? {} : { background: "var(--price-up)" }}
          onClick={() => onSubmit(side, market, total)}>
          {market.name} {buying ? "매수" : "매도"}
        </Button>
        <p style={{ fontSize: 11, color: "var(--color-muted)", margin: 0, lineHeight: 1.5 }}>
          수수료는 체결 금액의 0.05%이며 주문 시 안내됩니다. 디지털 자산 투자는 원금 손실의 위험이 있습니다.
        </p>
      </div>
    </div>
  );
}
Object.assign(window, { OrderForm });
