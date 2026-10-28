# Exchange UI kit

Dense crypto-trading surface — the desktop exchange view. Recreates Coinone's
three-pane layout: **market list · chart · order form**, with thin hairline
dividers and right-aligned tabular numerals.

## Files
- `index.html` — interactive composition. Pick a market on the left, watch the
  chart + ticker update, place a buy/sell order → confirm Dialog → success toast.
- `data.jsx` — shared market data, `won()` formatter, inline SVG icons.
- `ExchangeHeader.jsx` — top nav (logo, sections, login/signup).
- `MarketList.jsx` — search, filter Chips, market Table with favorite stars.
- `ChartPane.jsx` — ticker header + range Tabs + area chart (KR up=red/down=blue).
- `OrderForm.jsx` — buy/sell Tabs, price/qty Inputs, percent chips, primary CTA.

## Notes
- Composes DS primitives from `window.CoinoneDesignSystem_c36949` (Button, Input,
  Table, Tabs, Chip, Badge, Dialog, IconButton). The chart line is a deterministic
  data viz, not a brand asset.
- Recreation only — no live data or real orders. The logo is the placeholder
  wordmark; swap in the official mark.
