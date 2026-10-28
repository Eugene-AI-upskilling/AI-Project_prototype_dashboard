# Marketing UI kit

Calm marketing / onboarding landing page — the airy, reassuring counterpart to
the dense exchange. Centered single-column rhythm, one primary blue CTA, plain
trust-first copy.

## Files
- `index.html` — full landing page; the signup field fires a success toast.
- `MarketingNav.jsx` — sticky blurred top nav.
- `Hero.jsx` — headline, single primary CTA, live ticker strip.
- `Sections.jsx` — `Features` (trust cards), `SignupCTA` (30-second signup +
  app-store buttons on navy), `MarketingFooter` (risk disclosure).

## Notes
- Composes DS primitives from `window.CoinoneDesignSystem_c36949` (Button, Input,
  Card, Badge). Navy `#062554` is the only dark section; everything else is flat
  white with hairline borders.
- Copy follows the brand voice: concrete, low-friction, no hype ("딱 30초면
  완료할 수 있어요"). Recreation only; logo is the placeholder wordmark.
