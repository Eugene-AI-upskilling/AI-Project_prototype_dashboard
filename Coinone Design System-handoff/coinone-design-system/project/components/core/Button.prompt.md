Coinone's button — use exactly one filled-blue `primary` action per view; everything else is `secondary` (outline), `accent` (inline emphasis), or `text`.

```jsx
<Button variant="primary" size="md">30초면 가입 완료</Button>
<Button variant="secondary">취소</Button>
<Button variant="accent">회원가입</Button>
<Button variant="text">자세히 보기</Button>
<Button variant="store">App Store</Button>
<Button variant="primary" fullWidth>입금하기</Button>
```

Variants: `primary` (filled #0B59D5, 15/700, 46px), `secondary` (white + #DDE4EB border), `accent` (transparent + #1772F8 outline, 24px, signup/inline), `text` (link blue), `store` / `store-dark` (48px app-store buttons). Sizes `sm`/`md`/`lg`. Never stack two filled-blue CTAs in one viewport.
