Underline tab bar. Active tab gets a near-black bold label and a 2px blue underline.

```jsx
<Tabs
  items={[{ id: "krw", label: "원화" }, { id: "btc", label: "BTC" }, { id: "fav", label: "관심" }]}
  value={tab}
  onChange={setTab}
/>
```
