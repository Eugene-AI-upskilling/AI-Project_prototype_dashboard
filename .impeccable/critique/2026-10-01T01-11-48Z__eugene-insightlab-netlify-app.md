---
target: "https://eugene-insightlab.netlify.app/"
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "url:https://eugene-insightlab.netlify.app/"
timestamp: 2026-10-01T01-11-48Z
slug: eugene-insightlab-netlify-app
---
# Critique — https://eugene-insightlab.netlify.app/ (2026-10-01)
Method: dual-agent (A: design review · B: detector + browser)

## Heuristics — 22/40 (Acceptable)
1 System status 2 · 2 Real world 3 · 3 Control 2 · 4 Consistency 2 · 5 Error prevention 2 · 6 Recognition 3 · 7 Flexibility 2 · 8 Minimalist 2 · 9 Error recovery 1 · 10 Help 3

## Specificity
Partly authored (KR up-red/down-blue, investor net-buy, DART table, theme bubble map, AI anchor) but the shell is category-interchangeable: stock-photo hero, 4 decorative English glass chips, same eyebrow/H2/sub/card template x8.
Detector: 125 CLI findings (98 low-contrast from ~6 token pairs, pulsing-dot 9, dark-glow 7, skipped-heading, wide-tracking, gradient-text on league).

## Priority issues
- [P0] Raw "null", placeholder titles ("[산업분석] 리포트"), analyst login IDs, home vs market index mismatch, "++2.1%", boilerplate AI summary — harden
- [P1] Mobile breakage: quant.html 1014px wide (div.panel 994px), reports.html 481px (rep-side/rep-tablecard/repPager), events table wraps per syllable — adapt
- [P1] Generic hero takes the prime viewport; AI anchor (most ownable asset) buried in section 2 — distill → bolder
- [P1] Brand blue #3182f6 on white = 3.7:1 (buttons, current nav), eyebrow 3.2:1, #8d9299 3.1:1, #4dabf7 on #edf7ff 2.3:1 — colorize/audit (token fix)
- [P2] 2.06MB font on every page (league loads twice ~4.1MB), 583KB logo shown at 142px with baked fake-checkerboard (no alpha), CLS 0.21-0.22 on quant/league — optimize
- [P2] Template monotony, 3 sign-up CTAs, cramped members-only overlay; reveal-on-scroll hides content by default — layout/polish/harden

## Personas
Jordan: jargon (Leadership, 집중도, 이디오, MDD), null cards, Trading League leaves site. Casey: hidden nav items, 9px ticker labels, clipped tables, 53/230 targets <44px on home. Alex: conflicting numbers, no timestamps, no watchlist/saved filters.

## Minor
Bubble labels 9-10px and colliding; analyst row leaves empty gutter; strategy template headline shows CAGR −0.89%; heatmap orphans; skipped headings h2→h4; unlabeled range/select controls.
