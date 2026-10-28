---
name: coinone-design
description: Use this skill to generate well-branded interfaces and assets for Coinone (코인원), the Korean cryptocurrency exchange, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Tokens & CSS:** link `styles.css` (root) — it `@import`s `tokens/*.css`.
- **Components:** `components/**` (React). Card HTMLs load `_ds_bundle.js` and read
  `window.CoinoneDesignSystem_c36949`.
- **UI kits:** `ui_kits/exchange` (dense trading surface), `ui_kits/marketing`
  (calm landing/onboarding).
- **The one rule:** one filled-blue (`#0B59D5`) primary action per view, on flat
  white with `#DDE4EB` hairlines. Price direction is KR convention —
  **up = red `#E0344B`, down = blue `#0B59D5`**. No emoji. Calm in marketing,
  dense in data.
