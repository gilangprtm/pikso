# PIKSO-CATALOG-CARD-RADIUS/r1

## Bounded contract — lightweight
- Execution: `direct_native`; responsibility: `native_pi`; target `/mnt/storage/projects/nana-website`, baseline snapshots `/tmp/pikso-catalog-radius-before/` (repository has no Git metadata).
- Objective: make the public catalog book-card top and bottom corners uniformly rounded as requested with screenshot `/tmp/aionui/508f1441/IMG_8097.jpeg`.
- Included: catalog-only cover image and fade corner clipping, regression assertions, tests/lint/types/build and routine authorized local build activation.
- Excluded: global card shapes, reader/admin, image/title/color/card sizing/layout, book data/assets, API/database/auth/cache, environment/proxy/credentials, migrations, commit/push, browser tooling.
- Acceptance: (1) all four catalog-card corners use same radius; image and white fade obey it; (2) mobile/desktop have no overriding asymmetric radius; existing title/fade/card contracts remain; (3) full checks/build/activation pass.
- Internal phases: native-workflow → native-programmer + reuse-first → implementation → native-quality-review (`self_review`). KITAB healthy; STD-023 resolved/read. Next CSS guide read.

## Reuse-first inspection and diagnosis
- Existing catalog lives in `src/app/books/page.tsx` plus scoped `.catalog-screen` rules in `src/app/globals.css`; `.catalog-screen .book-card` had uniform `18px` radius and overflow hidden. Cover inherits shape. The white `::after` overlay covered the full card but had no border radius, so its opaque fade could visually square the lower card corners despite the parent clipping. Screenshot matches that likely layering mismatch; device computed pixels are not inspected.
- Existing responsive rules do not override the catalog card radius. General `.book-cover` has a different radius, but scoped catalog `border-radius:inherit` already wins for its box.
- Reuse decision `EXTEND_EXISTING`: retain single canonical `18px` card radius and apply `border-radius:inherit` to the existing image and fade overlay, so every visible layer uses the same corners. No new abstraction, markup, or radius token.

## Changes
- `src/app/globals.css`: catalog image and white fade overlay explicitly inherit the card radius.
- `tests/catalog-cards.test.ts`: assert uniform 18px base radius; image/cover/fade inheritance; no breakpoint-specific radius override for relevant catalog layers. Existing card, white-fade, mobile max280/title contracts unchanged.
- No other product/runtime behavior intended to change.

## Verification and close
- `npm test`: 66/66 PASS; `npm run lint`: PASS; `npm run typecheck`: PASS; `npm run build`: PASS (all EXIT 0). Focused regression is part of catalog-card test suite.
- Activated build `8Z2xPFIy778Bl695zHMEY` under standing Owner authorization after `/proc` verified previous PID 74901, project cwd, `next-server (v16.4.3)`, socket inode 164001759; new PID 75817 same cwd/command, socket inode 164161025 on `0.0.0.0:3000`. Evidence `/tmp/pikso-catalog-radius-activation.json`.
- Local and domain `/books` both HTTP 200. Fetched production CSS from each: confirmed 18px card radius and inherited image/fade radii. This is served CSS evidence, not device screenshot evidence. Capture `/tmp/pikso-catalog-radius-http.json`.
- Criterion 1 PASS: card, image, and white fade share corners. Criterion 2 PASS: no breakpoint-specific radius override; prior geometry/title/fade/mobile rules remain asserted. Criterion 3 PASS: checks/build/listener/served CSS verified.
- Self-review of diff: only two CSS declarations in existing catalog scope, targeted tests, and this result note. No global shapes/data/assets/behavior changed. No findings.
- Review mode `self_review`, code/served-CSS gate `PASS`, device visual behavior `UNKNOWN` (browser testing prohibited/not conducted). Lifecycle `completed`; next decision: Tuan may reload `/books` and confirm visual appearance; no further authorization needed for this bounded task.
- No PDF/book/status/database/environment/proxy/auth/credentials/dependency/migration/commit/push effects. Diff `/tmp/pikso-catalog-radius.diff`; logs `/tmp/pikso-catalog-radius-{tests,lint,types,build}.log`.
