// Coinone Exchange — shared market data + small inline icons.
const CN_MARKETS = [
  { id: "btc", sym: "BTC", name: "비트코인", price: 142300000, change: 2.41, vol: "1,204억" },
  { id: "eth", sym: "ETH", name: "이더리움", price: 4820500, change: -1.08, vol: "892억" },
  { id: "xrp", sym: "XRP", name: "리플", price: 3212, change: 5.62, vol: "2,031억" },
  { id: "sol", sym: "SOL", name: "솔라나", price: 268400, change: -0.34, vol: "421억" },
  { id: "doge", sym: "DOGE", name: "도지코인", price: 312, change: 1.27, vol: "688억" },
  { id: "ada", sym: "ADA", name: "에이다", price: 1184, change: -2.15, vol: "204억" },
  { id: "trx", sym: "TRX", name: "트론", price: 412, change: 0.08, vol: "151억" },
  { id: "link", sym: "LINK", name: "체인링크", price: 38420, change: 3.94, vol: "97억" },
];

const won = (n) => "₩" + n.toLocaleString("ko-KR");

const Icon = {
  search: (p) => <svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  star: (p) => <svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill={p?.fill||"none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>,
  bell: (p) => <svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  spark: (p) => <svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2m0 14v2M5 12H3m18 0h-2M6 6l1.5 1.5M18 18l-1.5-1.5M6 18l1.5-1.5M18 6l-1.5 1.5"/></svg>,
};

Object.assign(window, { CN_MARKETS, won, Icon });
