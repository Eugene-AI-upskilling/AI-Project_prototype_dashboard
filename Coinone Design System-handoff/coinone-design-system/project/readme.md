# Coinone Design System

A brand & product design system for **Coinone** (코인원) — one of Korea's
longest-running cryptocurrency exchanges (est. 2014). The product face pairs a
trustworthy, institutional blue with a clean, high-density trading surface: a
fintech tone that must read as both **safe** and **fast**.

> "Trust before excitement." Calm white surfaces, one confident blue, plain
> language, safety-first states — lifted by a brighter point-blue used sparingly
> for emphasis and AI/automation features.

---

## Sources

This system was derived from the official Coinone brand material below. No
codebase or Figma file was provided — tokens and component specs come from the
brand guideline prose. If you have access, verify against:

- **Brand guideline (BI v4.0):** https://coinonecorp.com/company/brand
- **Brand guideline PDF:** https://image-public.coinone.co.kr/download/corphome/coinone_guide_4.0.pdf
- **Live exchange site:** https://coinone.co.kr

**Verified:** 2026-06-03 · **OMD:** 0.1

### Caveats / substitutions
- **Logo:** the official BI mark could not be fetched in this environment.
  `assets/coinone-wordmark.svg` and `assets/coinone-symbol.svg` are typographic
  **placeholders** in Coinone Blue — replace them with the real files from the
  brand guideline.
- **Font:** Pretendard is loaded from the orioncactus CDN (the system-class
  Korean/Latin sans the brand specifies). No proprietary display face exists on
  web, so no substitution was needed.

---

## Content fundamentals

Coinone's voice is **steady, plain, and reassuring** — a regulated exchange
explaining money clearly, not hyping coins.

- **Person & tone:** warm second-person ("you"/"-요" polite Korean endings),
  concrete and low-friction. Confident, never breathless.
- **Casing:** sentence case throughout. No ALL-CAPS shouting, no exclamation
  spam. Numerals are precise (fees, percentages, durations stated plainly).
- **Emoji:** **none.** Use icon components or colored dots instead — emoji break
  visual coherence and the brand reads as institutional.
- **What to do:** explain risk and fees plainly; make actions concrete and
  small ("30초면 가입 완료" / "Done in 30 seconds").
- **What to avoid:** FOMO/hype ("지금 안 사면 후회!"), slangy crypto-degen tone,
  buried terms, over-promised returns.

Illustrative live-copy samples:
- "딱 30초면 완료할 수 있어요!" — signup nudge, friendly & concrete
- "스마트 트레이딩 바로가기" — feature CTA, direct & plain
- "방문 상담 예약하기" — support, calm & service-oriented

**Status text** leans muted and quiet: empty = "보유 자산이 없어요" in muted gray
with a single blue CTA; errors are inline and specific, never alarming.

---

## Visual foundations

**Atmosphere.** A calm, blue-anchored fintech exchange that wants to feel *safe
before exciting*. Chrome is mostly white with near-black text; a single
confident blue carries every primary action and the brand itself. "Boring on
purpose" trust aesthetic, lifted by a brighter point-blue for emphasis.

**Color.** One identity-blue family does the work:
- `#006BD6` Coinone Blue (brand) · `#0B59D5` primary CTA (live) ·
  `#1772F8` accent outline · `#0090FF` point blue (emphasis) ·
  `#194386` deep supporting / hover · `#062554` darkest navy.
- Text: `#040505` near-black → `#17181B` strong → `#6B7684` muted.
- Lines & fills: `#DDE4EB` hairline borders, `#EBF0F5` surface tint.
- **Never** recolor the identity blue toward teal/purple.
- **Trading direction is KR convention: price-up = RED `#E0344B`,
  price-down = BLUE `#0B59D5`.** (Not Western red/green.)

**Type.** System Pretendard-class sans. Hero/section titles bold & near-black
(32/700); control labels 15/700; body 13–15px / 400–500; micro-labels 12/400
muted. Trading numerals run **dense, right-aligned, tabular**, weighted 500–700
when they change.

**Spacing & layout.** 8px base; controls cluster at 8/12/18px gaps. Marketing &
onboarding are centered, single-column, generous vertical rhythm, one primary
CTA. Exchange views are dense multi-pane (market list · chart · order form) with
right-aligned numeric columns and thin `#DDE4EB` dividers. Sectioning by border
and spacing, **not** heavy cards.

**Depth & elevation.** Low overall. Flat white surfaces; 1px `#DDE4EB` borders
do most separation. Shadows reserved for floating menus/modals, kept soft and
short (`rgba(0,0,0,0.05) 0 1px 2px`). Radius scale: **3px** inline tags · **6px**
chips · **8px** buttons/cards · **10px** store/large · **50%** icon buttons.

**Cards.** Flat white, 1px hairline border, 8px radius, no/soft shadow. Avoid
shadow-heavy cards in trading views — they slow scanning.

**Backgrounds.** Predominantly flat white. No gradients, textures, or
hand-drawn illustration as a system motif. Surface tint `#EBF0F5` for soft
fills only.

**Hover / press / focus.** Filled primary darkens to `#194386` on hover; press
darkens slightly + subtle scale. Outline/secondary lighten their fill to the
tint. Focus rings use the accent outline blue. Disabled = `#CFD0D3` fill, no
border emphasis, non-interactive cursor.

**Motion & easing.** 120ms micro (hover/press) · 200ms toggles/toasts · 300ms
page/section. Ease-out for entrances, ease-in-out for toggles. Price/number
changes flash briefly (red up / blue down) then settle — motion communicates
direction, never decorates. Keep motion minimal in trading views.

---

## Iconography

- **Library:** a single consistent line-icon set. This system links
  **Lucide** from CDN as the working substitute (clean 24×24 grid, 1.5–2px
  stroke, geometric) — it matches the brand's flat, neutral, line-based feel.
  *Flag:* the live product's exact icon set was not available; replace with the
  brand's own SVGs if/when provided.
- **Rules:** icons are inline SVG (not `<img>`), inherit `currentColor`, never
  hard-coded fills. Stroke 1.5–2px, consistent everywhere.
- **Sizing:** 16px inline (badges/labels) · 18px button icons · 24px standalone
  (nav/cards) · 32–48px feature/empty-state.
- **No emoji, ever.** Status = colored dots or icon components, not emoji.
  Do/Don't markers = text prefixes or icons.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (link this one file). `@import`s only.
- `readme.md` — this guide.
- `SKILL.md` — portable Agent-Skill wrapper.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
`base.css`. CSS custom properties (base values + semantic aliases).

**`assets/`** — `coinone-wordmark.svg`, `coinone-symbol.svg` (placeholders).

**`components/`** — reusable React primitives:
- `core/` — **Button**, **IconButton**, **Badge**, **Chip**
- `forms/` — **Input**
- `data/` — **Card**, **Table**, **Tabs**, **Dialog**

**`ui_kits/`** — full-screen recreations:
- `exchange/` — dense trading surface (market list · chart · order form)
- `marketing/` — calm onboarding / marketing landing

**`templates/`** — copy-able starting points consuming projects can seed from
(each loads the system via `ds-base.js`):
- `exchange/` — the trading surface as a template
- `marketing/` — the landing / onboarding page as a template

**`guidelines/`** — foundation specimen cards (colors, type, spacing) shown in
the Design System tab.
